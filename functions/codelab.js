const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const region = 'asia-east2';
const runtimeOpts = {
  timeoutSeconds: 4,
  memory: "2GB"
};
const request = require("request-promise");
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message";
const LINE_CONTENT_API = "https://api-data.line.me/v2/bot/message";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: "Bearer YOUR-CHANNEL-ACCESS-TOKEN"
};

exports.UCL = functions.region(region).runWith(runtimeOpts).https.onRequest(async (req, res) => {
  // [1] Get event[0]
  switch (event.type) {
    case 'message':
      if (event.message.type === 'image') {
        // [4] Call doImage()
      } else if (event.message.type === 'text' && event.message.text === 'subscribe') {
        // [3] Reply message how to subscibe

        // [10] Create LIFF and Flex Message
      } else {
        // [2]
        // Get latest score from RTDB
        // Reply message payload
      }
      break;
    case 'postback': {
      // [7]
      // Define reject msg
      /// Define team by spliting '=' from postback data
      /// If you are fanpantae
      // Write userId to RTDB
      // Set accept msg
      // Reply subscription status
      break;
    }
  }
  return null;
});

const doImage = async (event) => {
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  // [5]
  // Define URL with getContentUrl
  // Check LIFF condition by contentProvider
  // Donwload binary by building buffer
  // Create local temp file
  // Define bucket
  // Upload temp file
  /// Remove local file
  // Reply for waiting
}

exports.logoDetection = functions.region(region).runWith(runtimeOpts).storage.object().onFinalize(async (object) => {
  // [6]
  // Define vars
  // Predict by Cloud Vision API
  /// Define itemArray
  /// For each logos to logo
  /// Check score confidential
  // Push quickreply to itemArray
  // Define vars 2
  // Check empty items
  /// Push
});

exports.liveScore = functions.region(region).runWith(runtimeOpts).database.ref('ucl/score').onWrite(async (change, context) => {
  // [8]
  /// Define result from after val
  /// Define and get userIds from RTDB
  /// For each Object keys
  /// Push
});

exports.finalScore = functions.region(region).pubsub.schedule('* * * * *').timeZone('Asia/Bangkok').onRun(async context => {
  // [9]
  // Define result and get latest score from RTDB
  // broadcast with ending message
});

// Push Message
const push = (userId, msg, quickItems) => {
  return request.post({
    headers: LINE_HEADER,
    uri: `${LINE_MESSAGING_API}/push`,
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text: msg, quickReply: quickItems }]
    })
  })
}

// Reply Message
const reply = (token, payload) => {
  return request.post({
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: token,
      messages: [payload]
    })
  })
}

// Broadcast Messages
const broadcast = (msg) => {
  return request.post({
    uri: `${LINE_MESSAGING_API}/broadcast`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      messages: [{ type: "text", text: msg }]
    })
  })
};