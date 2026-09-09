/**
 * Revisão por LLM de visão (PROMO-IA-15) — auditoria visual da página do advisor.
 *
 * Envia screenshots para um modelo multimodal via OpenRouter e exige achados
 * concretos (elemento visual citado + impacto na compreensão), em JSON.
 *
 * Uso:
 *   OPENROUTER_API_KEY=... node tests/visual/vision-review.mjs \
 *     --dir <pasta de screenshots> --out <json> --stage before|after \
 *     --model google/gemini-3.8-flash --context <arquivo .md com o contexto>
 *
 * A chave vem do ambiente (nunca do repositório); o script não grava credenciais.
 */
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'

const exec = promisify(execFile)
const argv = process.argv.slice(2)
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : fallback
}

const DIR = arg('dir')
const OUT = arg('out', 'vision-review.json')
const STAGE = arg('stage', 'before')
const MODEL = arg('model', 'google/gemini-3.8-flash')
const CONTEXT_FILE = arg('context')
const MAX_IMAGES = Number(arg('max-images', '10'))
const MAX_WIDTH = Number(arg('max-width', '1400'))
const MAX_TOKENS = Number(arg('max-tokens', '6000'))

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) {
  console.error('Faltou OPENROUTER_API_KEY no ambiente.')
  process.exit(2)
}

const context = CONTEXT_FILE ? await readFile(CONTEXT_FILE, 'utf8') : ''

const INCLUDE_STATES = argv.includes('--include-states')
const files = (await readdir(DIR, { withFileTypes: true }))
  .filter((e) => e.isFile() && e.name.endsWith('.png'))
  .map((e) => e.name)
  .sort()
if (INCLUDE_STATES) {
  const states = (await readdir(join(DIR, 'states'), { withFileTypes: true }).catch(() => []))
    .filter((e) => e.isFile() && e.name.endsWith('.png'))
    .map((e) => `states/${e.name}`)
    .sort()
  files.push(...states)
}

const chosen = files.slice(0, MAX_IMAGES)
if (!chosen.length) {
  console.error(`Nenhum PNG em ${DIR}`)
  process.exit(2)
}

const tmp = join(tmpdir(), `promo-ia-15-${STAGE}-${Date.now()}`)
await mkdir(tmp, { recursive: true })

const images = []
for (const name of chosen) {
  const src = join(DIR, name)
  const small = join(tmp, name)
  await mkdir(dirname(small), { recursive: true })
  await exec('sips', ['-Z', String(MAX_WIDTH), src, '--out', small]).catch(async () => {
    await exec('cp', [src, small])
  })
  const buf = await readFile(small)
  images.push({ name, dataUrl: `data:image/png;base64,${buf.toString('base64')}` })
}

const schemaHint = `{
  "stage": "${STAGE}",
  "summary": "2-4 frases sobre o estado geral da tela",
  "first_15_seconds": {
    "o_que_precisa_de_atencao": "o que um usuário não técnico responderia olhando só a primeira dobra",
    "qual_e_a_recomendacao": "idem",
    "por_que_esta_bloqueado": "idem",
    "veredito": "entende / entende em parte / não entende"
  },
  "findings": [
    {
      "id": "F1",
      "severity": "P0|P1|P2",
      "area": "cabeçalho|kpis|filtros|tabela|badges|cores|terminologia|estados|detalhe|mobile|a11y",
      "evidence": "elemento visual concreto que você vê na imagem (texto exato do rótulo, coluna, badge, cor, número)",
      "impact": "como isso atrapalha a compreensão/operação do usuário",
      "recommendation": "mudança concreta e verificável"
    }
  ],
  "hierarchy": { "score_0_10": 0, "why": "" },
  "density": { "score_0_10": 0, "why": "" },
  "color_semantics": { "score_0_10": 0, "why": "", "colors_that_conflict": [] },
  "terminology": { "score_0_10": 0, "why": "", "terms_to_rename": [] },
  "states": { "score_0_10": 0, "why": "" },
  "mobile": { "score_0_10": 0, "why": "" },
  "accessibility_notes": [],
  "top_5_changes": []
}`

const userText = `Você é designer de produto sênior e pesquisador de UX, especialista em dashboards operacionais.
Revise as capturas da página /app/promotions/advisor do SellerBot (assistente de promoções do Mercado Livre).
O usuário final é o dono da operação: NÃO é técnico. Ele precisa, em menos de 15 segundos, responder:
(1) o que precisa da minha atenção hoje, (2) qual é a recomendação, (3) por que algo está bloqueado.

Contexto do produto:
${context}

Imagens (na ordem): ${images.map((i, idx) => `${idx + 1}. ${i.name}`).join(', ')}.

Regras da revisão:
- PROIBIDO conselho genérico ("melhore a hierarquia"). Cada achado deve CITAR o elemento visual concreto
  que aparece na imagem (rótulo exato, coluna, badge, chip, cor, número) e dizer o impacto na compreensão.
- Quantifique quando possível (nº de colunas, nº de cores, nº de controles, tamanho relativo).
- Avalie: hierarquia visual, excesso de informação/densidade, tabela (colunas, cabeçalho duplo de filtros,
  largura, ordenação), filtros, terminologia (o texto é do dono ou do programador?), cores e contraste
  (existe legenda? cores com semântica?), estados vazio/carregando/erro, clareza das ações, mobile e a11y
  (contraste, alvos de toque, foco/aria).
- Compare desktop x mobile x estados quando as imagens permitirem.
- Responda APENAS com JSON válido, sem markdown, exatamente neste formato:
${schemaHint}`

const body = {
  model: MODEL,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: userText },
      ...images.map((i) => ({ type: 'image_url', image_url: { url: i.dataUrl } })),
    ],
  }],
  temperature: 0.2,
  max_tokens: MAX_TOKENS,
  response_format: { type: 'json_object' },
}

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://127.0.0.1:9000',
    'X-Title': 'SellerBot PROMO-IA-15 visual audit',
  },
  body: JSON.stringify(body),
})

const raw = await res.text()
if (!res.ok) {
  console.error('OpenRouter error', res.status, raw.slice(0, 500))
  process.exit(1)
}

const payload = JSON.parse(raw)
const content = payload.choices?.[0]?.message?.content || ''
let parsed = null
try {
  parsed = JSON.parse(content)
} catch {
  const match = content.match(/\{[\s\S]*\}/)
  parsed = match ? JSON.parse(match[0]) : { raw: content }
}

await writeFile(OUT, JSON.stringify({
  stage: STAGE,
  model: MODEL,
  reviewedAt: new Date().toISOString(),
  images: chosen,
  usage: payload.usage || null,
  review: parsed,
}, null, 2))
await rm(tmp, { recursive: true, force: true })
console.log(`revisão ${STAGE}: ${chosen.length} imagens, modelo ${MODEL} -> ${OUT}`)
console.log(`achados: ${(parsed.findings || []).length}`)
