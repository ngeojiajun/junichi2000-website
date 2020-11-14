const {parseFile} = require("./modules/compiler.js");
const fs = require('fs');
const https=require("https");
const {rules,exclude,names,token,purge_after_deploy,zone_id}=require("./config.js")
let posts={};
let timer=setInterval(()=>{},500);
async function loadFolders(name,id){
  let queue=[];
  let files= fs.readdirSync(name,{withFileTypes:true});
  files.filter(x=>x.isFile()&&x.name.endsWith(".txt")&&!x.name.startsWith("~"))
  .map(x=>x.name)
  .map(x=>x.slice(0,x.length-4))
  .forEach(file => {
    queue.push(parseFile(`${name}/${file}.txt`)
                .then(x=>{x.pageTags=undefined;return x;})
                .then(x=>{
                  x.path=`${name}/${file}.txt`.replace(/\/\//g,"/");
                  if(posts[file]!==undefined)file=`${id}-${file}`;
                  if(rules[id]!==undefined){
                    let tmp={};
                    Object.assign(tmp,rules[id]);
                    Object.assign(tmp,x.properties);
                    x.properties=tmp;
                  }
                  if(!x.properties.base){
                    x.properties.base=`/${id}`;
                  }
                  if(names[id]){
                    let exist=(x.tag.filter(a=>a===names[id]).length)!==0;
                    if(!exist){
                      x.tag.push(names[id]);
                    }
                  }
                  posts[file]=x;
                })
              );
  });
  files.filter(x=>x.isDirectory()).map(x=>x.name)
      .forEach(dir=>queue.push(loadFolders(`${name}/${dir}/`,dir)));
  await Promise.all(queue).then(()=>{
    if(exclude.includes(id)||!id||id.length==="")return;
    //add meta pages for each category
    let obj={
      title:`${names[id]||id}`,
      tag:[],
      properties:{
        "dont-enumerate": "true", /*dont list it in homepage*/
        "hide-timestamp": "true", /*hide timestamp*/
        "hide-tags":"true",
        "url":"/",
        "base":`/${id}`,
        "show-in-nav":"true", /*show the link in navigation*/
        "role":"meta"
      },
    };
    posts[`meta-${id}`]=obj;
  });
}

loadFolders("./posts/","").then(x=>fs.writeFileSync("./posts.json",JSON.stringify(posts,null,4)))
                  .then(()=>new Promise((resolve,reject)=>{
                    if(!purge_after_deploy){
                      resolve();
                      return;
                    }
                    const options={
                      method:"POST",
                      headers:{
                        "Authorization":`Bearer ${token}`,
                        "Content-Type":"application/json"
                      }
                    };
                    const req=https.request(
                      `https://api.cloudflare.com/client/v4/zones/${zone_id}/purge_cache`,
                      options,
                      (res)=>{
                          let data = '';
                          console.log('Status Code:', res.statusCode);
                          res.on('data', (chunk) => {
                              data += chunk;
                          });
                          res.on('end', () => {
                              let json=JSON.parse(data);
                              console.log('Body: ', json);
                              if(json.success){
                                resolve();
                              }
                              else{
                                reject("API error")
                              }
                          });
                      }).on("error",reject);
                      req.write('{"purge_everything":true}')
                      req.end();
                  }))
                  .catch(console.error)
                  .finally(()=>clearInterval(timer));
