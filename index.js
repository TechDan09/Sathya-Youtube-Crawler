require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const cron = require('node-cron');
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const apiKey = process.env.API_KEY;
const channelId = process.env.CHANNEL_ID;
// const channelId = `UCV0qA-eDDICsRR9rPcnG7tw`; //test channel id
const apiUrl = `https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&maxResults=50&type=video&key=${apiKey}`;
const channelUrl = 'https://www.youtube.com/c/SriSathyaSaiVrindaOfficial/';

//helper function to write data to file
const writeToFile = (data, filename) => {
  fs.writeFile(filename, data, (err) => {
    if (err) {
      console.log('Error on saving to file', err);
    }
    console.log('saved to file');
  });
};

//send a request to youtube api for live video link
const getLiveVideoLink = (url) => {
  axios
    .get(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;',
      },
    })
    .then((response) => {
      if (response.data.pageInfo.totalResults > 0) {
        const videoId = response.data.items[0].id.videoId;
        const videoLink = `https://www.youtube.com/watch?v=${videoId}`;
        const result = {
          title: response.data.items[0].snippet.title,
          description: response.data.items[0].snippet.description,
          thumbnailLarge: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          thumbnailSmall: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          link: videoLink,
        };
        writeToFile(JSON.stringify(result), 'youtubeLink.json');
        console.log('Channel Is Live');
        return videoLink;
      } else {
        console.log('Couldnt Find Link, Channel Not Live');
      }
    })
    .catch((error) => {
      console.log(`Error on getting video link: `, error);
    });
};

//check if its live by manually scrapping youtube feed and searching for keywords ("text":" watching") that tells us a channel is live before calling youtube api to get live url in order to save GCP credits
const checkIfLive = () => {
  axios
    .get(channelUrl, {
      headers: {
        //very important, this took me hours to figure out as I kept getting my target keyword in a different language due to my current location :(
        'Accept-Language': 'en-US,en;',
      },
    })
    .then((response) => {
      let content = response.data.toString();
      let isLive = content.includes('"text":" watching"');
      if (isLive) {
        getLiveVideoLink(apiUrl);
      } else {
        console.log('Channel not live');
        return;
      }
    })
    .catch((error) => {
      console.log('Error on Checking Live: ', error);
    });
};

// call the checkiflive function every 5 minutes
cron.schedule('*/1 * * * *', function () {
  checkIfLive();
});

//Client Endpoint
app.get('/get-live-video-link', (req, res) => {
  const data = fs.readFileSync('./youtubelink.json', 'utf8');
  if (!data) {
    res.status(503).send('Link Unavailable');
  }
  res.send(JSON.parse(data));
});

//Start express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
