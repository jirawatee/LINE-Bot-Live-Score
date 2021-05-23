const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const crypto = require('crypto');
const request = require("request-promise");
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();
const region = 'asia-northeast1';
const runtimeOpts = { timeoutSeconds: 8, memory: "1GB", maxInstances: 1};
const LINE_CHANNEL_SECRET = functions.config().lineoa.developer.channel_secret;
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message";
const LINE_CONTENT_API = "https://api-data.line.me/v2/bot/message";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${functions.config().lineoa.developer.channel_access_token}`
};

exports.UCL = functions.region(region).runWith(runtimeOpts).https.onRequest(async (req, res) => {
  const text = JSON.stringify(req.body);
  const signature = crypto.createHmac('SHA256', LINE_CHANNEL_SECRET).update(text).digest('base64').toString();
  if (signature !== req.headers['x-line-signature']) {
    return res.status(401).send('Unauthorized');
  }

  let event = req.body.events[0];
  switch (event.type) {
    case 'message':
      if (event.message.type === 'image') {
        await doImage(event);
      } else if (event.message.type === 'text' && event.message.text === 'subscribe') {
        await reply(event.replyToken, {
          "type": "flex",
          "altText": "Flex Message",
          "contents": {
            "type": "bubble",
            "direction": "ltr",
            "hero": {
              "type": "image",
              "url": "https://persources.com/wp-content/uploads/2019/03/UCL_FINAL_.jpg",
              "size": "full",
              "aspectRatio": "1.51:1",
              "aspectMode": "fit"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "กรุณายืนยันตัวตนด้วยการอัพโหลดรูปที่มีโลโกทีมที่คุณชื่นชอบ",
                  "align": "start",
                  "wrap": true
                }
              ]
            },
            "footer": {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                {
                  "type": "button",
                  "action": {
                    "type": "uri",
                    "label": "LIFF",
                    "uri": "line://app/1575372380-jdaY42Xb"
                  },
                  "style": "primary"
                }
              ]
            }
          }
        });
      } else {
        /* 
        // Firebase Realtime Database
        let latest = await admin.database().ref('ucl/score').once('value');
        await reply(event.replyToken, { type: 'text', text: latest.val() });
        */
        
        // Cloud Firestore
        let latest = await admin.firestore().doc('ucl/final').get();
        await reply(event.replyToken, { type: 'text', text: latest.data().score });
      }
      break;
    case 'postback': {
      let msg = 'ทีมที่คุณเลือกมันเข้ารอบมาชิง UCL ซะทีไหนเล่า ปั๊ดโถ่!';
      let team = event.postback.data.split('=')[1].toLowerCase();
      if (team.indexOf('liverpool') >= 0 || team.indexOf('tottenham') >= 0) {
        // Firebase Realtime Database
        // await admin.database().ref('ucl/uid').child(event.source.userId).set(true);

        // Cloud Firestore
        await admin.firestore().doc('ucl/final').collection('uid').doc(event.source.userId).set({});

        msg = 'ยินดีด้วยคุณผ่านการยืนยันตัวตน ระบบจะรายงานผลบอลคู่ชิงคู่นี้ให้คุณทุกลมหายใจ';
      }
      await reply(event.replyToken, { type: 'text', text: msg });
      break;
    }
  }
  return res.end();
});

const doImage = async (event) => {
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  const UUID = require("uuid-v4");

  let url = `${LINE_CONTENT_API}/${event.message.id}/content`;
  if (event.message.contentProvider.type === 'external') {
    url = event.message.contentProvider.originalContentUrl;
  }

  let buffer = await request.get({
    headers: LINE_HEADER,
    uri: url,
    encoding: null
  });

  const tempLocalFile = path.join(os.tmpdir(), 'temp.jpg');
  await fs.writeFileSync(tempLocalFile, buffer);

  const bucket = admin.storage().bucket();
  await bucket.upload(tempLocalFile, {
    destination: `${event.source.userId}.jpg`,
    metadata: {
      cacheControl: 'no-cache',
      metadata: {
        firebaseStorageDownloadTokens: UUID()
      }
    }
  });

  fs.unlinkSync(tempLocalFile);
  reply(event.replyToken, { type: 'text', text: 'ขอคิดแป๊บนะเตง...' });
};

exports.logoDetection = functions.region(region).runWith(runtimeOpts).storage.object().onFinalize(async (object) => {
  /*
  const contentType = object.contentType;
  if (!contentType.startsWith("image/")) {
    return console.log("This is not an image.");
  }
  */
  const fileName = object.name;
  const userId = fileName.split('.')[0];

  const [result] = await client.logoDetection(`gs://${object.bucket}/${fileName}`);
  const logos = result.logoAnnotations;

  let itemArray = [];
  logos.forEach(logo => {
    if (logo.score >= 0.5) {
      
      // label 20 limits
      let twenty = '';
      if (logo.description.length > 20) {
        twenty = logo.description.substr(0, 20);
      }

      itemArray.push({
        type: 'action',
        action: {
          type: 'postback',
          label: twenty,
          data: `team=${logo.description}`,
          displayText: logo.description
        }
      });
    }
  });

  let msg = '';
  let quickItems = null;

  if (itemArray.length > 0) {
    msg = 'เลือกทีมที่คิดว่าใช่มาหน่อยซิ';
    quickItems = { items: itemArray };
  } else {
    msg = 'ไม่พบโลโกในภาพ ลองส่งรูปมาใหม่ซิ';
    quickItems = null;
  }

  await push(userId, msg, quickItems);
  return null;
});

/* 
// Firebase Realtime Database
exports.liveScore = functions.region(region).runWith(runtimeOpts).database.ref('ucl/score').onWrite(async (change, context) => {
  let latest = change.after.val();
  let userIds = await admin.database().ref('ucl/uid').once('value');
  Object.keys(userIds.val()).forEach(userId => {
    push(userId, latest, null);
  })
});
 */

// Cloud Firestore
exports.liveScore = functions.region(region).runWith(runtimeOpts).firestore.document('ucl/final').onWrite(async (change, context) => {
  let latest = change.after.data().score;
  let userIds = await admin.firestore().doc('ucl/final').collection('uid').get()
  userIds.forEach(doc => {
    push(doc.id, latest, null);
  });
  return null;
});

exports.finalScore = functions.region(region).runWith(runtimeOpts)
  .pubsub.schedule('28 of may 03:10').timeZone('Asia/Bangkok').onRun(async context => {
    /* 
    // Firebase Realtime Database
    let result = await admin.database().ref('ucl/score').once('value');
    broadcast(`จบการแข่งขัน\n${result.val()}`);
    */

    // Cloud Firestore
    let result = await admin.firestore().doc('ucl/final').get();
    broadcast(`จบการแข่งขัน\n${result.data().score}`);
  });

const push = (userId, msg, quickItems) => {
  return request.post({
    headers: LINE_HEADER,
    uri: `${LINE_MESSAGING_API}/push`,
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text: msg, quickReply: quickItems }]
    })
  });
};

const reply = (token, payload) => {
  return request.post({
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: token,
      messages: [payload]
    })
  });
};

const broadcast = (msg) => {
  return request.post({
    uri: `${LINE_MESSAGING_API}/broadcast`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      messages: [{ type: "text", text: msg }]
    })
  });
};