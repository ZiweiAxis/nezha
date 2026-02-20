// diting-proxy：代理与鉴权入口（I-014 多容器形态占位）。
// 当前推荐使用 cmd/diting_allinone 一体部署；本入口为未来拆分为独立代理服务预留。
package main

import "fmt"

func main() {
	fmt.Println("diting-proxy: placeholder for multi-container mode. Use cmd/diting_allinone for full stack.")
}
