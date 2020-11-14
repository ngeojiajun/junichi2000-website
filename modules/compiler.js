const fs = require('fs');
const readline=require("readline");
let throwParametersMismatch = (file,lineNo,tag,expected,actual) =>{throw new Error(`${file} ${lineNo}:\t${tag}: expected ${expected} args but provided ${actual}`)};
let throwCustome=(file,lineNo,tag,message)=>{throw new Error(`${file} ${lineNo}:\t${tag}: ${message}`)};
function isPositiveInteger(v) {
  var i;
  return v && (i = parseInt(v)) && i > 0 && (i === v || ''+i === v);
}
module.exports = {
  parseFile: f =>new Promise(function(resolve, reject) {
    let parsedObjects={title:undefined,tag:[],properties:{},timestamp:undefined,pageTags:[]};
    let inParaNode=false,inRawMode=false;
    let style={};
    let reader = readline.createInterface({
      input: fs.createReadStream(f)
    });
    let lineNo=0;
    let paragraphText=""
    reader.on("line",line=>{
      lineNo++;
      try{
        if(!inParaNode&&!line.startsWith("#"))
          throw new Error(`Invalid tag at line ${lineNo} in ${f}`);
        else if(inParaNode&&!line.startsWith("#"))
          paragraphText+=line+((inRawMode)?"\n":"");
        else if(inParaNode&&line.startsWith("#")){
          if(line.trim()==="#end"){
            inParaNode=false;
            parsedObjects.pageTags.push({type:"paragraph",text:paragraphText,useRaw:inRawMode,style:style});
            paragraphText="";
            inRawMode=false;
            style={};
          }
          else
            throw new Error(`Invalid tag at line ${lineNo} in ${f}`);
        }
        else{
          let param=line.slice(1).trim().split(" ").map(x=>x.trim());
          if(param[0]==="parastart"){
            if(param.length!=1)throwParametersMismatch(f,lineNo,"parastart",0,param.length-1);
            inParaNode=true;
          }
          else if(param[0]==="rawstart"){
            if(param.length!=1)throwParametersMismatch(f,lineNo,"rawstart",0,param.length-1);
            inParaNode=true;
            inRawMode=true;
          }
          else if(param[0]==="title"){
            if(parsedObjects.title)throwCustome(f,lineNo,"title","Title already set")
            else if(param.length<=1)throwParametersMismatch(f,lineNo,"title",1,param.length-1);
            else{
              let title=line.slice(("#title").length).trim();
              if(title.length===0)throwParametersMismatch(f,lineNo,"title",1,0);
              else parsedObjects.title=title;
            }
          }
          else if(param[0]==="tag"){
            if(param.length<=1)throwParametersMismatch(f.lineNo,"tag",1,param.length-1);
            else{
              let tag=line.slice(("#tag").length).trim();
              if(tag.length===0)throwParametersMismatch(f,lineNo,"tag",1,0);
              else{
                let exist=(parsedObjects.tag.filter(x=>x===tag).length)!==0;
                if(!exist){
                  parsedObjects.tag.push(tag);
                }
              }
            }
          }
          else if(param[0]==="prop"){
            if(param.length<=2)throwParametersMismatch(f,lineNo,"prop",3,param.length-1);
            else{
              let value=param.slice(2).join(" ");
              parsedObjects.properties[param[1]]=value;
            }
          }
          else if(param[0]==="style"){
            if(inParaNode) throwCustome(f,lineNo,"style","cannot set style while in text");
            else if(param.length<=2)throwParametersMismatch(f,lineNo,"style",3,param.length-1);
            else{
              let value=param.slice(2).join(" ");
              style[param[1]]=value;
            }
          }
          else if(param[0]==="timestamp"){
            let tag=line.slice(("#timestamp").length).trim();
            if(parsedObjects.timestamp)throwCustome(f,lineNo,"timestamp","Timestamp already set")
            else if(tag.length==2)throwParametersMismatch(f,lineNo,"timestamp",1,0);
            else{
              try{
                parsedObjects.timestamp=Math.floor(new Date(isPositiveInteger(tag)?parseInt(tag):tag).getTime()/1000);
              }
              catch(e){
                throwCustome(f,lineNo,"timestamp","Invalid args");
              }
            }
          }
          else if(param[0]==="image"){
            if(param.length!=4)throwParametersMismatch(f,lineNo,"image",4,param.length-1);
            else{
              let object={type:"image",alt:"",url:"",caption:false,style:style};
              object.url=param[1];
              object.caption=param[2].toLowerCase()==="true"?true:false;
              object.alt=param[3].toLowerCase()==="none"?undefined:param.slice(3).join(" ");
              parsedObjects.pageTags.push(object);
              style=[];
            }
          }
          else{
            throw new Error(`Invalid tag "${param[0]}" at line ${lineNo} in ${f}`);
          }
        }
      }
      catch(e){
        reader.removeAllListeners()
        reader.close();
        reject(e);
      }
    });
    reader.on("close",()=>{
      if(inParaNode)reject("Unexpected EOF");
      else if(!parsedObjects.title&&parsedObjects.properties.role!=="home")reject("Missing Title");
      else{
        let paragraphs=parsedObjects.pageTags.filter(x=>x.type==="paragraph")
        let hit=true;
        let escapeHTML=x=>x.replace(/\&/gm,"&amsp;").replace(/\</gm,"&lt;").replace(/\>/gm,"&gt;");
        while (hit){
          hit=false;
          let regex=/(?<!\\)\[link\s*=\s*((?:[^\]\s])+)\s*\]((?:(?!(?:(?<!\\)\[)).)+)\[\/link\]/gm;
          paragraphs.filter(x=>!x.useRaw&&x.text.match(regex)!=null).forEach((e,i)=>{
              if(!e._useRaw){
                e.text=escapeHTML(e.text);
                e._useRaw=true;
              }
              e.text=e.text.replace(regex,"<a href=\"$1\">$2</a>");
              if(!hit)hit=true;
          });
          regex=/(?<!\\)\[highlight\]((?:(?!(?:(?<!\\)\[)).)+)\[\/highlight\]/gm
          paragraphs.filter(x=>!x.useRaw&&x.text.match(regex)!=null).forEach(e=>{
            if(!e._useRaw){
              e.text=escapeHTML(e.text);
              e._useRaw=true;
            }
            e.text=e.text.replace(regex,"<span class=\"highlight\">$1</span>");
            if(!hit)hit=true;
          })
          regex=/(?<!\\)\[break\/\]/gm;
          paragraphs.filter(x=>!x.useRaw&&x.text.match(regex)!=null).forEach(e=>{
            if(!e._useRaw){
              e.text=escapeHTML(e.text);
              e._useRaw=true;
            }
            e.text=e.text.replace(regex,"<br/>");
            e._useRaw=true;
          })
          paragraphs.filter(x=>!x.useRaw).forEach(e=>{
            /*allow \[ but not \[~*/
            e.text=e.text.replace(/\\\[(?!\~)/gm,"[").replace(/\\\]/gm,"]");
          });
        }
        paragraphs.filter(x=>!x.useRaw).forEach(e=>{
          e.text=e.text.replace(/\[\~/gm,"[").replace(/\~\]/gm,"]");
        });
        paragraphs.forEach(e => {
          e.text=e.text.replace(/\\\#/gm,"#");
          if(e._useRaw){
            e.useRaw=true;
            e._useRaw=undefined;
          }
        });
        resolve(parsedObjects);
      }
    });
  })
};
