const loader=require("./loader.js");
const strings=require("../locales/ja.js");
const {getPage,generateUrl}=require("./page_context.js")
function parseInteger(x, base) {
  const parsed = parseInt(x, base);
  if (isNaN(parsed)||Number(x)!==parsed) { return NaN; }
  return parsed;
}

function generateListBase(req,res,next,base /*in page*/,max,url_base,tag){
  let _list=loader.getEnumratableBlog(tag);
  if(_list.length===0){
    next();
    return;
  }
  //we move the security check here to prevent overflow
  if(base*max>=_list.length){
    next();
    return;
  }
  let post=_list.slice(base*max,(base+1)*max).map(x=>{let a=loader.getManifest(x);a._link=generateUrl(x);return a;});
  const pages=Math.trunc(_list.length/max)+((_list.length%max===0)?0:1);
  res.render("home",{
    strings:strings,
    page:Object.assign({meta:loader.getMetaTagUrl(tag)!==undefined},getPage("posts")),
    post:post,
    env:{
      name:req.params.post,
      use_pages:_list.length>max,
      idx:base,
      pages:pages,
      url_base:url_base,
      base:`/${req.params.meta||""}`,
      tag:tag?`#${tag}`:strings.posts
    }
  });
}
module.exports=(app,Hook)=>{
  let asyncHandler=(method,route,handler)=>{
    app[method](route,async(res,req,next)=>{
      try{
        await handler(res,req,next);
      }
      catch(e){
        next(e)
      }
    })
  };
  asyncHandler("get","/tags/:tag/:id",async function(req,res,next){
    if(isNaN(parseInteger(req.params.id))){
      next();
      return;
    }
    generateListBase(req,res,next,parseInteger(req.params.id)-1,20,`/tags/${req.params.id}/`,decodeURIComponent(req.params.tag));
  });
  asyncHandler("get","/tags/:tag",async function(req,res,next){
    generateListBase(req,res,next,0,20,`/tags/${req.params.id}/`,decodeURIComponent(req.params.tag));
  });
  asyncHandler("get","/posts/:id",async function(req,res,next){
    if(isNaN(parseInteger(req.params.id))){
      next();
      return;
    }
    generateListBase(req,res,next,parseInteger(req.params.id)-1,20,"/posts/");
  });
  asyncHandler("get","/posts/",async function(req,res,next){
    generateListBase(req,res,next,0,20,"/posts/");
  });
  asyncHandler("get","/:meta/:id/",async function(req,res,next){
    if(isNaN(parseInteger(req.params.id))){
      next();
      return;
    }
    if(!loader.isMetaLink(req.params.meta)){
      next();
      return;
    }
    let tag=loader.getMetaTag(req.params.meta);
    if(!tag){
      next();
      return;
    }
    generateListBase(req,res,next,parseInteger(req.params.id)-1,20,`/${req.params.meta}/`,tag);
  });
  asyncHandler("get","/:base/:post/",async function(req,res,next){
    //このハンドラーは特別の名前を付けられたページアクセスために設定された
    let matches=loader.getUrlBlogByName(req.params.post,`/${req.params.base}`);
    if(matches.length===0){
      next();
      return;
    }
    else{
      let post=await loader.getPost(matches[0]);
      let list=loader.getEnumratableBlog();
      let showPrevNext=list.includes(matches[0]);
      let currentIndex=list.indexOf(matches[0]);
      let prev=(currentIndex+1>=list.length)?undefined:list[currentIndex+1];
      let next=(currentIndex-1<0)?undefined:list[currentIndex-1];
      res.render("home",{
        strings:strings,
        page:getPage("post"),
        post:post,
        env:{
          name:req.params.post,
          base:`/${req.params.base}`,
          showPrevNext:showPrevNext,
          prev:prev,
          next:next
        }
      });
    }
  });
  asyncHandler("get","/:meta/",async function(req,res,next){
    if(!loader.isMetaLink(req.params.meta)){
      next();
      return;
    }
    let tag=loader.getMetaTag(req.params.meta);
    if(!tag){
      next();
      return;
    }
    generateListBase(req,res,next,0,20,`/${req.params.meta}/`,tag);
  });
  asyncHandler("get","/:post/",async function(req,res,next){
    //このハンドラーは特別の名前を付けられたページアクセスために設定された
    let matches=loader.getUrlBlogByName(req.params.post);
    if(matches.length===0){
      //メタページであるか確認する
      next();
      return;
    }
    else{
      let post=await loader.getPost(matches[0]);
      let list=loader.getEnumratableBlog();
      let showPrevNext=list.includes(matches[0]);
      let currentIndex=list.indexOf(matches[0]);
      let prev=(currentIndex+1>=list.length)?undefined:list[currentIndex+1];
      let next=(currentIndex-1<0)?undefined:list[currentIndex-1];
      res.render("home",{
        strings:strings,
        page:getPage("post"),
        post:post,
        env:{
          name:req.params.post,
          showPrevNext:showPrevNext,
          prev:prev,
          next:next
        }
      });
    }
  });
  asyncHandler("get","/",async function(req,res,next){
    let ids=loader.getHome();
    if(ids.length===0){
      res.render("home",{
        strings:strings,
        page:getPage("home"),
        env:{name:""}
      });
    }
    else{
      let post=await loader.getPost(ids[0]);
      res.render("home",{
        strings:strings,
        page:Object.assign({context:"home"},getPage("post-inline")),
        post:post,
        env:{name:""}
      });
    }
  });
  app.use(function(req,res){
      res.status(404);
      res.render("home",{
        strings:strings,
        page:getPage("error"),
        env:{
          name:"",
          error:strings.page_not_found,
          error_desc:strings.page_not_found_txt
        }
    })
  })
  app.use((err, req, res, next)=> {
    console.error(err);
    Hook.err("ブログ","エラーが発生した\n"+err);
    if (res.headersSent) {
      return next(err)
    }
    res.status(500)
    res.render("home",{
      strings:strings,
      page:getPage("error"),
      env:{
        name:"",
        error:strings.server_error,
        error_desc:strings.server_error_txt
      }
    });
  });
}
