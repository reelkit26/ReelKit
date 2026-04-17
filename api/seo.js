export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, platform } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  const year = new Date().getFullYear();

  return res.status(200).json({
    titles: [
      `🔥 ${topic} — Must Watch ${year}`,
      `This ${topic} Video Will Change Everything!`,
      `Every Creator Must Know This About ${topic}`
    ],
    tags: [
      `#${topic.replace(/\s+/g,'')}`,
      '#contentcreator', '#reelstips', '#youtubetips',
      '#instagramreels', '#viral', '#trending',
      '#youtubeIndia', '#reelsindia', '#creatortool',
      '#freetool', '#videoediting', '#socialmedia',
      '#digitalcreator', '#creatoreconomy', '#reelkit',
      '#shortstips', '#videoedit', '#instagramIndia',
      `#creator${year}`, '#indiancreator'
    ],
    description: `${topic} — perfect for Indian creators on ${platform}! Use ReelKit to remove watermarks from your videos and images for free. Get AI-powered SEO tags to grow faster on YouTube and Instagram Reels. Try ReelKit free at reelkit.in #reelkit #viral #reelsindia #contentcreator #${topic.replace(/\s+/g,'')}`
  });
}