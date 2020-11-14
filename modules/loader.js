const {parseFile}= require("./compiler.js");
const fs= require("fs");
let map={};
let manifest={};
let keys={};
function reset(){
  manifest= JSON.parse(fs.readFileSync('./posts.json', 'utf8'));
  map={};
  keys=Object.keys(manifest);
  //逆の設定で順番を反転させる
  keys.sort((a,b)=>{
    let _a=manifest[a];
    let _b=manifest[b];
    if(_a.timestamp&&_b.timestamp){
      return _b.timestamp-_a.timestamp;
    }
    else if(_a.timestamp){
      return -1;
    }
    else return 1;
  })
}
function init(){
  if(!fs.existsSync("./posts.json")){
    throw new Error("posts.json not found");
  }
  //load the files
  reset();
  //setup watcher to watch the changes
  fs.watchFile("./posts.json",()=>{
    console.log("File is updated, reloading");
    reset();
  });
}
async function load(name){
  if(map[name]){
    return map[name];
  }
  else if(!manifest[name]){
    throw new Error("Post not exist");
  }
  else if (!fs.existsSync(manifest[name].path)) {
    throw new Error("Internal Error: Post is registered in the manifest but the file is missing");
  }
  else{
    map[name]=await parseFile(manifest[name].path);
    map[name].tag=manifest[name].tag;
    map[name].properties=manifest[name].properties; //プロパティを適用する
    return map[name];
  }
}
module.exports = {
  getManifest:(x)=>manifest[x],
  getEnumratableBlog:(tag)=>
                      keys.filter(x=>manifest[x].properties["dont-enumerate"]!=="true")
                      .filter(x=>(!tag)||manifest[x].tag.includes(tag)&&manifest[x].properties["hide-tags"]!=="true"),
  getPages:()=>keys.filter(x=>manifest[x].properties["show-in-nav"]==="true")
              .filter(x=>manifest[x].properties["role"]!=="home"),
  getUrlBlogByName:(name,base)=>keys.filter(x=>{
    let obj=manifest[x];
    if(obj.properties["role"]==="home")return false;
    let _name=(obj.properties["url"]||x);
    let _base=(obj.properties["base"]||"/");
    return name===_name&&(base||"/")===_base;
  }),
  isMetaLink:(name)=>(keys.map(x=>manifest[x].properties)
                      .filter(x=>x.role==="meta")
                      .filter(x=>{
                        return x.base===`/${name}`&&x.url==="/"
                      })
                      .length!==0),
  isMetaPage:(name)=>(keys.filter(x=>x===name).map(x=>manifest[x]).filter(x=>x.properties["role"]==="meta").length!==0),
  getMetaTagUrl:(tag)=>(keys.map(x=>manifest[x])
                        .filter(x=>x.properties["role"]==="meta")
                        .filter(x=>x.title===tag)
                        .map(x=>x.properties)
                        .map(x=>`${x.base}/${x.url}`.replace(/\/\//g,"/"))[0]
                      ),
  getMetaTag:base=>keys.map(x=>manifest[x])
                        .filter(x=>x.properties["role"]==="meta")
                        .filter(x=>x.properties.base===`/${base}`&&x.properties.url==="/")
                        .map(x=>x.title)[0],
  getPost:name=>load(name),
  getHome:()=>keys.filter(x=>manifest[x].properties["role"]==="home"),
  exists:name=>manifest[name]!==undefined
};
init();
