const { ChatOpenAI } = require('@langchain/openai');
const { OpenAIEmbeddings } = require('@langchain/openai');
const Draft = require('../models/Draft');
const { OPENAI_API_KEY, OPENAI_MODEL } = require('../config');

const llm = new ChatOpenAI({ apiKey: OPENAI_API_KEY, model: OPENAI_MODEL, temperature: 0.7 });
const embedder = new OpenAIEmbeddings({ apiKey: OPENAI_API_KEY });

async function retrieveExamplesForUser(user, k = 5) {
  const posted = await Draft.find({ user: user._id, status: 'POSTED' }).sort({ createdAt: -1 }).limit(50).lean();
  if (!posted.length) return [];
  const seed = 'Generate a Hinglish conversation-style LinkedIn post';
  const qVec = await embedder.embedQuery(seed);

  function cosine(a,b){
    let dot=0, na=0, nb=0; for(let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
    if(!na||!nb) return 0; return dot/(Math.sqrt(na)*Math.sqrt(nb));
  }

  const scored = [];
  for(const p of posted){ if(!p.embedding||!p.embedding.length) continue; scored.push({doc:p, score: cosine(qVec, p.embedding)}); }
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0,k).map(s=>s.doc);
}

async function generateDraftForUser(user) {
  const examples = await retrieveExamplesForUser(user, 5);
  const fewShot = examples.map((e, i) => `Example ${i + 1}:\n${e.content}`).join('\n\n');
  const prompt = `You are a LinkedIn copywriter. 
              Tone: conversational, witty, English-Hindi code-switching. 
              Keep it light and professional. 
              Use 2-3 turns in dialogue format (Interviewer: / Me:). Individual lines must be shorter than 5 words.
              Write in plain text, do not use asterisks or Markdown formatting. 
              End with a punchline without any emoji. 
              Avoid politics and abusive content. Give it a human touch and don't add "final punch" or "final punchline" in the end.

              Examples:
              ${fewShot}

              Generate one post.`;
  // const prompt = `You are a LinkedIn copywriter. Tone: conversational, witty, English-Hindi code-switching. Keep it light and professional. Use 2-6 turns (Interviewer/Me style), end with a punchline without any emoji. Avoid politics and abusive content.\n\nExamples:\n${fewShot}\n\nGenerate one post.`;
  const resp = await llm.invoke([{ role: "user", content: prompt }]);
  const text = resp.content.trim();
  console.log("joke generated from llm");

  const draft = new Draft({ user: user._id, content: text, status: 'DRAFT' });
  await draft.save();
  try {
    const vec = await embedder.embedQuery(text);
    draft.embedding = vec;
    await draft.save();
  } catch (err) {
    console.warn('embedding failed', err && err.message);
  }
  return draft;
}

module.exports = { generateDraftForUser };