const { WebClient } = require("@slack/web-api");
const {
  createMessageServer,
} = require("../controllers/conversationController");
const { User } = require("../models/userModel");

const client = new WebClient();

// SLACK OAUTH
// app.get("/auth/slack", async (_, res) => {
const addToSlackButton = async (_, res) => {
  const userScopes =
    "channels:history,channels:read,chat:write,groups:history,im:history,mpim:history,users.profile:read,users:read";
  const redirectURL =
    "https://j16zl6cwya.execute-api.us-east-1.amazonaws.com/default/synced-lambda/auth/slack/callback";
  // const redirectURL =
  //   "https://localhost:5000/default/synced-lambda/auth/slack/callback";
  const url = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&user_scope=${userScopes}&redirect_uri=${redirectURL}`;
  // const url = `https://slack.com/oauth/v2/authorize?client_id=4723984969072.4711155160818&user_scope=channels:history,channels:read,chat:write,groups:history,im:history,mpim:history,users.profile:read,users:read&redirect_uri=https://j16zl6cwya.execute-api.us-east-1.amazonaws.com/default/synced-lambda/auth/slack/callback`;
  // const url = `https://slack.com/oauth/v2/authorize?client_id=4723984969072.4711155160818&user_scope=channels:history,channels:read,chat:write,groups:history,im:history,mpim:history,users.profile:read,users:read&redirect_uri=https://localhost:5000/default/synced-lambda/;

  res.status(200).header("Content-Type", "text/html; charset=utf-8")
    .send(`<html><body>
    <a href="${url}"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>
    </body></html>`);
};

// app.get("/auth/slack/callback", async (req, res) => {
const slackOauthCallback = async (req, res) => {
  try {
    console.log(req.query.code);
    const response = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: req.query.code,
    });

    const slackToken = response.authed_user.access_token;
    const oauthUserId = response.authed_user.id;

    await User.updateOne(
      // { _id: req.user._id },
      { _id: "63e86b0399458809cbd2f4a0" },
      {
        $set: {
          slackUserId: oauthUserId,
          accessTokens: slackToken,
          // $push: { slackUserId: oauthUserId },
          // $addToSet: { accessTokens: { slack: slackToken } },
        },
      }
    );

    res.status(200).send(
      `<html><body>
            <p>You have successfully logged in with your Slack account! Here are the details:</p>
            <p>Response: ${JSON.stringify(response)}</p>
            <p>Slack T: ${JSON.stringify(slackToken)}</p>
            <p>OAuth Id: ${JSON.stringify(oauthUserId)}</p>`
    );
  } catch (err) {
    console.log("Error:", err);
  }
};

// A HTTP POST request to '/' (the server)
// Use token and api_app_id to verify that the request is coming from Slack
const getDataSlackEvent = async (req, res) => {
  const senderId = req.body.event.user;
  const senderName = getSenderData(senderId);

  const eventAuthUserId = req.body.authed.users[0];
  const user = User.findOne({ slackUserId: eventAuthUserId });
  const userId = user._id;

  req = {
    user: userId,
    sender: senderName,
    platformConversationId: req.body.event.channel,
    text: req.body.event.text,
    platform: "slack",
    eventTs: req.body.event.event_ts,
    type: req.body.event.channel_type,
    status: "unread",
  };

  processIncomingMessage(req, res);

  res.status(200);
};

const processIncomingMessage = (req, res) => {
  return new Promise((resolve) => {
    createMessageServer(req, res);
    resolve();
  });
};

const getSenderData = () => {
  return new Promise((resolve) => {
    async (senderId) => {
      let senderData;
      try {
        senderData = await client.users.profile.get({
          user: senderId,
        });
      } catch (err) {
        console.log(err);
      }

      return senderData.real_name;
    };
  });
};

const postMsgToSlack = async (channelId, message) => {
  try {
    await client.chat.postMessage({
      token: req.user.accessTokens.slack,
      channel: channelId,
      text: message,
    });
    console.log("Message posted");
  } catch (err) {
    console.log("Error:", err);
  }
};

module.exports = {
  addToSlackButton,
  slackOauthCallback,
  getDataSlackEvent,
  postMsgToSlack,
};
