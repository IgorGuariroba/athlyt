# Observabilidade no desenvolvimento

O Athlyt emite traces e métricas por OpenTelemetry (OTLP) e logs estruturados
em JSON. A stack local usa Grafana LGTM — Grafana, Loki, Tempo, Mimir e um
OpenTelemetry Collector em um único contêiner.

A instrumentação é **opt-in**: testes, builds e o `npm run dev` comum não abrem
conexões com um collector.

## Início rápido

Pré-requisito: Docker com Compose.

```bash
npm run observability:up
npm run dev:observability
```

- aplicação: <http://localhost:3000>
- Grafana: <http://localhost:3001> (sem autenticação no ambiente local)

Em **Explore**, selecione Tempo para traces e Mimir/Prometheus para métricas.
A métrica de negócio `athlyt.operacao.duracao` acompanha latência e
`athlyt.operacao.total` acompanha sucessos e falhas. Requisições HTTP e chamadas
`fetch` recebem spans automáticos; fronteiras de banco e negócio devem usar
`observarOperacao` para não acoplar a telemetria ao driver.

Para encerrar:

```bash
npm run observability:down
```

Os dados do Grafana ficam no volume Docker `athlyt-observability-data`. Para
apagá-los, execute o comando de encerramento com `--volumes` diretamente:

```bash
docker compose -f observability/compose.yml down --volumes
```

## Configuração

Consulte `.env.observability.example`. As variáveis principais são:

| Variável | Função |
| --- | --- |
| `OBSERVABILITY_ENABLED` | ativa a instrumentação (`true`, `1` ou `sim`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | endpoint HTTP base do collector |
| `OTEL_SERVICE_NAME` | nome do serviço nos painéis |
| `APP_ENV` | ambiente anexado à telemetria |
| `LOG_LEVEL` | nível mínimo dos logs Pino |

Variáveis OTEL padrão como `OTEL_EXPORTER_OTLP_HEADERS` continuam disponíveis
para apontar o app a outro collector sem mudar código.

## Privacidade e cardinalidade

Os dados do Athlyt incluem saúde e rotina. Portanto:

- não registre payloads, prompts, respostas, cookies ou objetos de domínio;
- não use `userId`, e-mail ou outro identificador pessoal como atributo;
- atributos devem ser técnicos, de baixa cardinalidade (operação, modelo,
  método, rota e status);
- o logger mascara chaves comuns de segredo e identidade, mas essa proteção não
  substitui a regra de nunca enviar o objeto sensível;
- a stack local não deve ser exposta à rede pública.

Use `observarOperacao` em fronteiras relevantes. Ela correlaciona logs com o
trace ativo e registra duração, resultado e exceções sem observar argumentos ou
retornos.
