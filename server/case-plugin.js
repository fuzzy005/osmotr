import { buildFallbackCase } from '../src/lib/fallbackCase.js'
import { premiseById } from '../src/lib/premises.js'
import { normalizeCase } from '../src/lib/caseShape.js'

const PREFERRED = 'gemini-3.8-flash'

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 100_000) {
        reject(Object.assign(new Error('big'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function clip(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function redact(apiKey, text) {
  return String(text || '').split(apiKey).join('[key]').slice(0, 240)
}

function schema() {
  const str = { type: 'string' }
  return {
    type: 'object',
    properties: {
      title: str,
      logline: str,
      briefing: str,
      truth: {
        type: 'object',
        properties: { culpritId: str, motive: str, summary: str },
        required: ['culpritId', 'motive', 'summary'],
      },
      people: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: str, name: str, role: str, blurb: str },
          required: ['id', 'name', 'role', 'blurb'],
        },
      },
      motives: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: str, text: str, correct: { type: 'boolean' } },
          required: ['id', 'text', 'correct'],
        },
      },
      clues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: str,
            anchorId: str,
            order: { type: 'integer' },
            kind: str,
            title: str,
            seen: str,
            body: str,
            hint: str,
            after: str,
          },
          required: ['id', 'anchorId', 'order', 'kind', 'title', 'seen', 'body', 'hint', 'after'],
        },
      },
      calls: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            number: str,
            personId: str,
            unlockClueId: str,
            nodes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: str,
                  text: str,
                  givesClueId: str,
                  choices: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { label: str, goto: str },
                      required: ['label', 'goto'],
                    },
                  },
                },
                required: ['id', 'text', 'givesClueId', 'choices'],
              },
            },
          },
          required: ['number', 'personId', 'unlockClueId', 'nodes'],
        },
      },
    },
    required: ['title', 'logline', 'briefing', 'truth', 'people', 'motives', 'clues', 'calls'],
  }
}

function promptFor(premise, anchors) {
  const places = anchors.map((anchor) => `${anchor.id} | ${anchor.label} | ${anchor.kind}`).join('\n')
  return [
    'Ты пишешь детективное дело целиком, до начала игры. Во время игры новых фактов не будет.',
    'Язык русский. Тон сухой и конкретный. Без шуток, мистики и жестоких подробностей.',
    'Место — одна комната игрока. Не придумывай другие адреса.',
    'Игрок — следователь, его нет среди подозреваемых.',
    `Завязка: ${premise.title}. ${premise.text}`,
    premise.body
      ? 'Ровно одна улика kind=body. Её anchorId — якорь с kind=floor. Тело накрыто тканью, без описания ран.'
      : 'Тела нет. kind=body запрещён. Следы — kind=trace.',
    'Якоря, другие id использовать нельзя:',
    places,
    'Сделай 3 человек с id p1 p2 p3. Один виновен. Имена русские, не знаменитости.',
    'Сделай 5 улик в комнате и 1 улику kind=call без anchorId: её текст открывается только из звонка.',
    'kind комнатных улик: note, object, trace и при необходимости body.',
    'У каждой комнатной улики свой осмысленный anchorId из списка. order с 1. after — id предыдущей улики или пустая строка у первых двух.',
    'briefing и первые две улики не называют виновного.',
    'hint говорит, на какой отмеченной вещи искать, и не называет виновного.',
    'seen — одно-два слова, как подпись на камере: записка, след, конверт, простыня.',
    'Два звонка. number ровно 4 цифры. unlockClueId — улика, из которой игрок узнал номер.',
    'У каждого звонка есть узел id=start. В узле 1–3 короткие реплики игрока. goto указывает на id узла или stop.',
    'Один узел второго звонка отдаёт givesClueId улики kind=call. В остальных узлах givesClueId пустая строка.',
    'motives: 3 штуки, ровно один correct=true. Этот мотив совпадает с truth.motive.',
    'truth.summary объясняет, что произошло на самом деле, уже можно назвать виновного.',
  ].join('\n')
}

function parseJson(text) {
  const clean = String(text || '').replace(/^```json\s*|\s*```$/g, '').trim()
  return JSON.parse(clean)
}

async function askModel(apiKey, model, prompt, withSchema) {
  const generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
  }
  if (withSchema) generationConfig.responseSchema = schema()
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(60000),
    },
  )
  if (!response.ok) {
    const error = new Error(`gemini ${response.status}`)
    error.status = response.status
    error.detail = redact(apiKey, await response.text())
    throw error
  }
  const payload = await response.json()
  const text = (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('')
  if (!text) throw Object.assign(new Error('empty'), { status: 502 })
  return parseJson(text)
}

async function writeCase(apiKey, premise, anchors) {
  const prompt = promptFor(premise, anchors)
  try {
    const raw = await askModel(apiKey, PREFERRED, prompt, true)
    const caseFile = normalizeCase(raw, anchors, premise)
    if (caseFile) {
      console.error('case ok', PREFERRED)
      return caseFile
    }
    console.error('case reject', PREFERRED)
  } catch (error) {
    console.error('case fail', PREFERRED, error.status || '', error.detail || error.message)
    if (error.status === 503 || error.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      try {
        const raw = await askModel(apiKey, PREFERRED, prompt, true)
        const caseFile = normalizeCase(raw, anchors, premise)
        if (caseFile) {
          console.error('case ok retry')
          return caseFile
        }
      } catch (retryError) {
        console.error('case retry', retryError.status || '', retryError.message)
      }
    }
    if (error.status !== 400) return null
  }
  try {
    const raw = await askModel(apiKey, PREFERRED, prompt, false)
    const caseFile = normalizeCase(raw, anchors, premise)
    if (caseFile) {
      console.error('case ok', PREFERRED, 'plain')
      return caseFile
    }
    console.error('case reject plain')
  } catch (error) {
    console.error('case fail plain', error.status || '', error.detail || error.message)
  }
  return null
}

export function casePlugin(apiKey) {
  return {
    name: 'case-api',
    configureServer(server) {
      server.middlewares.use('/api/case', async (req, res) => {
        if (req.method !== 'POST') {
          send(res, 405, { error: 'post' })
          return
        }
        try {
          const body = JSON.parse(await readBody(req))
          const premise = premiseById(body.premiseId)
          const anchors = (Array.isArray(body.anchors) ? body.anchors : [])
            .map((anchor) => ({
              id: clip(anchor.id, 16),
              kind: clip(anchor.kind, 24),
              label: clip(anchor.label, 40),
            }))
            .filter((anchor) => anchor.id && anchor.kind && anchor.label)
          if (!anchors.some((anchor) => anchor.kind === 'floor') || anchors.length < 4) {
            send(res, 400, { error: 'anchors' })
            return
          }
          let caseFile = null
          if (apiKey) caseFile = await writeCase(apiKey, premise, anchors)
          const source = caseFile ? 'gemini' : 'device'
          send(res, 200, { source, case: caseFile || buildFallbackCase(premise, anchors) })
        } catch (error) {
          send(res, error.status || 500, { error: 'case' })
        }
      })
    },
  }
}
