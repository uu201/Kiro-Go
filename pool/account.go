// Package pool 账号池管理
// 实现轮询负载均衡、错误冷却、Token 刷新
package pool

import (
	"kiro-go/config"
	"sync"
	"sync/atomic"
	"time"
)

// LastError 记录账号最近一次错误信息
type LastError struct {
	Message string `json:"message"`
	Time    int64  `json:"time"`
	IsQuota bool   `json:"isQuota"`
}

// AccountPool 账号池
type AccountPool struct {
	mu           sync.RWMutex
	accounts     []config.Account
	currentIndex uint64
	cooldowns    map[string]time.Time // 账号冷却时间
	errorCounts  map[string]int       // 连续错误计数
	lastErrors   map[string]LastError // 最近一次错误
}

var (
	pool     *AccountPool
	poolOnce sync.Once
)

// GetPool 获取全局账号池单例
func GetPool() *AccountPool {
	poolOnce.Do(func() {
		pool = &AccountPool{
			cooldowns:   make(map[string]time.Time),
			errorCounts: make(map[string]int),
			lastErrors:  make(map[string]LastError),
		}
		pool.Reload()
	})
	return pool
}

// Reload 从配置重新加载账号
// 构建加权列表：weight<=1 出现 1 次，weight>=2 出现 weight 次
func (p *AccountPool) Reload() {
	p.mu.Lock()
	defer p.mu.Unlock()
	enabled := config.GetEnabledAccounts()
	var weighted []config.Account
	for _, a := range enabled {
		w := a.Weight
		if w < 1 {
			w = 1
		}
		for j := 0; j < w; j++ {
			weighted = append(weighted, a)
		}
	}
	p.accounts = weighted
}

// GetNext 获取下一个可用账号（加权轮询）
// 返回账号的独立副本，避免并发请求间的数据竞争
func (p *AccountPool) GetNext() *config.Account {
	p.mu.RLock()
	defer p.mu.RUnlock()

	if len(p.accounts) == 0 {
		return nil
	}

	now := time.Now()
	n := len(p.accounts)
	seen := make(map[string]bool)

	// 加权轮询查找可用账号
	for i := 0; i < n; i++ {
		idx := atomic.AddUint64(&p.currentIndex, 1) % uint64(n)
		acc := &p.accounts[idx]

		if seen[acc.ID] {
			continue
		}

		// 跳过冷却中的账号
		if cooldown, ok := p.cooldowns[acc.ID]; ok && now.Before(cooldown) {
			seen[acc.ID] = true
			continue
		}

		// 跳过即将过期的 Token
		if acc.ExpiresAt > 0 && time.Now().Unix() > acc.ExpiresAt-300 {
			seen[acc.ID] = true
			continue
		}

		// 跳过额度已用尽的账号（允许超额的账号除外）
		if acc.UsageLimit > 0 && acc.UsageCurrent >= acc.UsageLimit && !acc.AllowOverage {
			seen[acc.ID] = true
			continue
		}

		copy := *acc
		return &copy
	}

	// 无可用账号，返回冷却时间最短的（排除额度用尽且不允许超额的）
	var best *config.Account
	var earliest time.Time
	for i := range p.accounts {
		acc := &p.accounts[i]
		if acc.UsageLimit > 0 && acc.UsageCurrent >= acc.UsageLimit && !acc.AllowOverage {
			continue
		}
		if cooldown, ok := p.cooldowns[acc.ID]; ok {
			if best == nil || cooldown.Before(earliest) {
				best = acc
				earliest = cooldown
			}
		} else {
			best = acc
			break
		}
	}
	if best != nil {
		copy := *best
		return &copy
	}
	return nil
}

// GetByID 根据 ID 获取账号（返回副本）
func (p *AccountPool) GetByID(id string) *config.Account {
	p.mu.RLock()
	defer p.mu.RUnlock()
	for i := range p.accounts {
		if p.accounts[i].ID == id {
			copy := p.accounts[i]
			return &copy
		}
	}
	return nil
}

// RecordSuccess 记录请求成功，清除冷却
func (p *AccountPool) RecordSuccess(id string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.cooldowns, id)
	p.errorCounts[id] = 0
}

// RecordError 记录请求错误，设置冷却
func (p *AccountPool) RecordError(id string, isQuotaError bool, message string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.errorCounts[id]++

	if message != "" {
		const maxLen = 500
		truncated := message
		if len(truncated) > maxLen {
			truncated = truncated[:maxLen] + "..."
		}
		p.lastErrors[id] = LastError{
			Message: truncated,
			Time:    time.Now().Unix(),
			IsQuota: isQuotaError,
		}
	}

	if isQuotaError {
		p.cooldowns[id] = time.Now().Add(time.Hour)
	} else if p.errorCounts[id] >= 3 {
		p.cooldowns[id] = time.Now().Add(time.Minute)
	}
}

// GetLastError 获取指定账号最近一次错误
func (p *AccountPool) GetLastError(id string) (LastError, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	e, ok := p.lastErrors[id]
	return e, ok
}

// GetLastErrors 获取所有账号最近错误的快照
func (p *AccountPool) GetLastErrors() map[string]LastError {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := make(map[string]LastError, len(p.lastErrors))
	for id, e := range p.lastErrors {
		out[id] = e
	}
	return out
}

// UpdateToken 更新账号 Token
func (p *AccountPool) UpdateToken(id, accessToken, refreshToken string, expiresAt int64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	for i := range p.accounts {
		if p.accounts[i].ID == id {
			p.accounts[i].AccessToken = accessToken
			if refreshToken != "" {
				p.accounts[i].RefreshToken = refreshToken
			}
			p.accounts[i].ExpiresAt = expiresAt
			break
		}
	}
}

// Count 返回账号总数
func (p *AccountPool) Count() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return len(p.accounts)
}

// AvailableCount 返回可用账号数
func (p *AccountPool) AvailableCount() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	now := time.Now()
	count := 0
	for _, acc := range p.accounts {
		if cooldown, ok := p.cooldowns[acc.ID]; ok && now.Before(cooldown) {
			continue
		}
		count++
	}
	return count
}

// UpdateStats 更新账号统计
func (p *AccountPool) UpdateStats(id string, tokens int, credits float64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	for i := range p.accounts {
		if p.accounts[i].ID == id {
			p.accounts[i].RequestCount++
			p.accounts[i].TotalTokens += tokens
			p.accounts[i].TotalCredits += credits
			p.accounts[i].LastUsed = time.Now().Unix()
			go config.UpdateAccountStats(id, p.accounts[i].RequestCount, p.accounts[i].ErrorCount, p.accounts[i].TotalTokens, p.accounts[i].TotalCredits, p.accounts[i].LastUsed)
			break
		}
	}
}

// GetAllAccounts 获取所有账号副本
func (p *AccountPool) GetAllAccounts() []config.Account {
	p.mu.RLock()
	defer p.mu.RUnlock()
	result := make([]config.Account, len(p.accounts))
	copy(result, p.accounts)
	return result
}
