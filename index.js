var express = require("express");
var app = express();
const fs = require('fs');
const https = require('https');
const {webhook_url,enable_webhook,production_mode}=require("./config.js");
//Webhookを使うなら設定して、使わないなら空き関数で置き換える
let Hook;
if(enable_webhook&&webhook_url&&String(webhook_url).length>0){
  const webhook = require("webhook-discord");
  Hook= new webhook.Webhook(webhook_url);
}
else{
  Hook={err:()=>{},success:()=>{}}
}
process.on('uncaughtException', function (err) {
  console.error(err)
  Hook.err("ブログ","エラーが発生した\n"+err);
});
app.set("view engine", "ejs");
app.use((req,res,next)=>{res.set("X-Powered-By","EBS-r1");next();})
app.use("/public",express.static("./public/"));
require("./modules/renderer.js")(app,Hook);
if(production_mode){
var privateKey  = fs.readFileSync('key.txt', 'utf8');
var certificate = fs.readFileSync('cert.txt', 'utf8');
var credentials = {key: privateKey, cert: certificate};
let httpsServer = https.createServer(credentials, app);
httpsServer.listen(443);
}
else{
  app.listen(80, () =>Hook.success("ブログ","起動された"))
}
