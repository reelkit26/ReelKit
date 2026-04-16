export default async function handler(req, res) {
  const { topic } = req.body;
  res.status(200).json({
    titles: [
      `🔥 ${topic} — Must Watch 2025`,
      `This ${topic} Video Will Change Everything!`,
      `Every Creator Needs to Know This About ${topic}`
    ],
    tags: ["#contentcreator","#reelstips","#youtubetips","#instagramreels","#viral","#trending","#youtubeIndia","#reelsindia","#creatortool","#freetool","#videoediting","#socialmedia","#digitalcreator","#creatoreconomy","#reelkit","#shortstips","#videoedit","#instagramIndia","#creator2025",`#${topic.replace(/\s+/g,'')}`],
    description: `Amazing ${topic} content for Indian creators! Perfect for YouTube and Instagram Reels. Use ReelKit to remove watermarks and boost your reach. #reelkit #viral #reelsindia #contentcreator`
  });
}