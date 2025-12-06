package cache

import (
	"sync"
	"time"
)

type CacheItem struct {
    Value      interface{}
    Expiration time.Time
}

type InMemoryCache struct {
    items map[string]CacheItem
    mu    sync.RWMutex
}

var instance *InMemoryCache
var once sync.Once

func GetCache() *InMemoryCache {
    once.Do(func() {
        instance = &InMemoryCache{
            items: make(map[string]CacheItem),
        }
    })
    return instance
}

func (c *InMemoryCache) Set(key string, value interface{}, duration time.Duration) {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    c.items[key] = CacheItem{
        Value:      value,
        Expiration: time.Now().Add(duration),
    }
}

func (c *InMemoryCache) Get(key string) (interface{}, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    
    item, found := c.items[key]
    if !found || time.Now().After(item.Expiration) {
        return nil, false
    }
    
    return item.Value, true
}

func (c *InMemoryCache) Delete(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    delete(c.items, key)
}
