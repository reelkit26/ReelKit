export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, platform } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Indian creator SEO for "${topic}" on ${platform}. Return ONLY valid JSON: {"titles":["t1","t2","t3"],"tags":["#tag1","#tag2",...20 tags total],"description":"150 word description"}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.map(i => i.text || '').join('') || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({
      titles: [
        `🔥 ${topic} — Must Watch 2025`,
        `This ${topic} Video Will Change Everything!`,
        `Every Creator Needs This ${topic} Hack`
      ],
      tags: ['#contentcreator','#reelstips','#youtubetips','#instagramreels','#viral','#trending','#youtubeIndia','#reelsindia','#creatortool','#videoediting','#socialmedia','#digitalcreator','#creatoreconomy','#reelkit','#shortstips','#videoedit','#instagramIndia','#creator2025','#'+topic.replace(/\s+/g,''),'#freetool'],
      description: `Amazing ${topic} content for Indian creators! Use ReelKit to remove watermarks and get AI SEO. Perfect for YouTube and Instagram Reels. #reelkit #viral #reelsindia #contentcreator`
    });
  }
}