module.exports={
  rules:{
    "special-pages":{
      "dont-enumerate": "true", /*dont list it in homepage*/
      "hide-timestamp": "true", /*hide timestamp*/
      "base":"/",
      "show-in-nav":"true", /*show the link in navigation*/
      "hide-tags":"true",
    }
  },
  exclude:["special-pages"],
  names:{
    development:"開発",
    dairy:"日記",
    nihongo:"日本語勉強"
  },
  token:"VNj7_vant_S9QMOjCX19wfghecEwzpWCOqM-MwQi",
  webhook_url:"https://discordapp.com/api/webhooks/745311168020873297/enJM_CRePNP6BpFjaBoS9lJfshKrwZOrGfwlmRfCDzBVZ6pvHi1bPCtPWZZ02iLQWtuG",
  enable_webhook:false,
  purge_after_deploy:false,
  zone_id:"a8d7d3dbe6e73b17d8ea4caf9512fa22",
  production_mode:false
}
