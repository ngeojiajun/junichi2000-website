const loader=require("./loader.js");
function expandTag(tags){
    let list=Object.keys(tags);
    return list.filter(x=>x!=="class").map(x=>`${x}:${tags[x]}`).join(";");
}
function generateUrl(post){
  let manifest=loader.getManifest(post);
  let base=manifest.properties["base"]||"/";
  let name=manifest.properties["url"]||post;
  return `${base}/${name}`.replace(/\/\//g,"/")
}
function getTitle(post){
  let manifest=loader.getManifest(post);
  return manifest.properties["nav-title"]||manifest.title;
}
function inPage(target,page,base){
  if(loader.isMetaPage(target)){
    return (base!==""?base:page)===loader.getManifest(target).properties["base"];
  }
  else{
    let url=generateUrl(target);
    return url===(`${base||"/"}/${page}`.replace(/\/\//g,"/"));
  }
}
function getTagLink(x){
  let link=loader.getMetaTagUrl(x);
  if(link)return link;
  return `/tags/${encodeURIComponent(x)}/`
}
function getPage(type){
  return {
    type:type,
    expandTag:expandTag,
    generateUrl:generateUrl,
    getTitle:getTitle,
    inPage:inPage,
    pinned:loader.getPages(),
    getManifest:loader.getManifest,
    getMetaTagUrl:loader.getMetaTagUrl,
    isMeta:loader.isMetaLink,
    getTagLink:getTagLink
  }
}
module.exports = {
  getPage:getPage,
  generateUrl:generateUrl
};
