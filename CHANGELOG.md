# Changelog

## v0.1.0 — TKX Franca (PWA + Otimizações)

### Added
- Nova aba “PROJEÇÕES DE FESTAS/EVENTOS” com:
  - Entrada de período (calendário) e parâmetros de demanda (dinâmico %, corridas extra %, motoristas)
  - Distribuição “Constante” vs “Curva S” com intensidade (k) e posição de pico
  - KPIs, gráfico diário com `ReferenceLine` no pico e capacidade
  - Exportação Excel com “Eventos” e “Eventos_Diário” (inclui Distribuição, Intensidade e Pico)
- PWA (installable + offline básico): manifesto, service worker e ícone SVG

### Changed
- Marketing: sliders reorganizados priorizando “Despesas Básicas” e “Marketing” no topo
- Título comparativo atualizado para “Comparativo semestral (mesmo período até 36º Mês)”
- `vite.config.ts`: `base` em produção para `/Lucios1000-novos-apps/` (GitHub Pages)

### Fixed
- Remoção de “Custos Mínimos” do UI para evitar dependências ocultas de custos
- Oculta seletor de cenário na aba Eventos
- Tipagens e ErrorBoundary para evitar travamentos em runtime
- Engine: usuários iniciais começam em 0 quando cenário está zerado

### Performance
- Import dinâmico do `xlsx` (carrega apenas ao exportar)
- Split de chunks: `react`, `recharts`, `xlsx`, `lucide-react`

### Docs/Infra
- Deploy automático via GitHub Pages (Actions) com fallback SPA (404.html)
- README com Live Demo e instruções PWA
