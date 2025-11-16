# Cathay Cargo Optimizer

前端使用 Next.js / Zustand 渲染 747F 机舱示意图，`/api/optimize` Route 会在服务端调 Supabase + GLPK 求解并返回最佳配载方案。

## 1. 环境变量

在项目根目录创建 `.env.local`：

```
NEXT_PUBLIC_SUPABASE_URL=<Supabase 项目 URL>
SUPABASE_SERVICE_ROLE_KEY=<Service Role Key，仅在服务端调用>
```

> Service Role Key **不要**泄露给浏览器端。如果前端需要直接查 Supabase 数据，可额外创建 anon key，并通过单独的 `supabaseBrowserClient` 初始化。

## 2. 安装与启动

```bash
npm install
npm run dev
# 默认监听 http://localhost:3000
```

## 3. 调用后端优化

- Endpoint：`POST /api/optimize`
- Headers：`Content-Type: application/json`
- Body：

```json
{ "flight_no": "CZ1234" }
```

兼容 `flightNo` 字段。服务端会：

1. 查询航班目标 CG (`flights.target_cg_long`)
2. 拉取 `uld_manifest`、`positions`
3. 调 GLPK 求解并写入 `optimization_layout`

成功响应示例：

```json
{
  "layout": [
    {
      "uldId": "AKE12345",
      "positionId": "P01",
      "weight": 1234,
      "xpos": 20,
      "ypos": 0
    }
  ],
  "cg": {
    "long": 22.4,
    "zLong": 0.4,
    "score": 92,
    "pure": 22.3
  }
}
```

错误码：

| Status | 说明 |
| ------ | ---- |
| 400 | 缺少或非法 `flight_no` |
| 404 | Supabase 未找到航班 |
| 422 | 航班数据不足或 GLPK 求解失败 |
| 500 | 其他异常，详见 server log |

### 航班数据加载

- Endpoint：`POST /api/flight`
- Body：`{ "flight_no": "CX2025" }`
- 返回内容：
  ```json
  {
    "flight": { "id": 1, "targetCgLong": 22.5 },
    "ulds": [{ "id": "AKE123", "weight": 2100 }],
    "positions": [{ "id": "CL", "xpos": 25, "ypos": 390 }]
  }
  ```
- 用途：前端在 “加载航班” 按钮中调用，Zustand 根据返回的 ULD / positions 填充界面。

## 4. 前端联调

`src/app/page.tsx` 工作流：

1. 输入航班号 → 点击“加载航班”：调用 `/api/flight`，把 Supabase 的 `uld_manifest`/`positions` 同步到前端。
2. 点击“AI一键装载”：调用 `/api/optimize`，生成方案并刷新舱位/CG/Score。
3. Loading 过程中会显示遮罩，成功后高亮新增的舱位；若想改为“确认后再写库”，可以在 `/api/optimize` 添加开关或另建 Route。

## 5. 推荐测试流程

1. **接口测试**

   ```bash
   curl -X POST http://localhost:3000/api/optimize \
     -H "Content-Type: application/json" \
     -d '{"flight_no":"CZ1234"}'
   ```

2. **数据库验证**  
   在 Supabase 控制台里检查 `optimization_layout` 是否新增对应 `flight_id` 记录；若 `flights / uld_manifest / positions` 数据缺失会返回 404/422。

3. **前端联调**  
   浏览器访问 `http://localhost:3000`，输入航班号并“开始优化”，在 Network 面板查看请求与 UI 渲染。

至此即可完成后端算法接入与前端展示。欢迎根据需要扩展历史记录、重新打分等能力。
