// Only render hashtags supplied by verified product data. A hashtag is
// display metadata here; no unverified hashtag-search behavior is attached.
export function CatalogBadges({category,hashtags=[],dailyLimit}:{category:string;hashtags?:readonly string[];dailyLimit?:number}){
 return <div className="catalog-card-labels"><span>{category}</span>{dailyLimit!==undefined&&<span>1日{dailyLimit.toLocaleString()}口限定</span>}{hashtags.filter(Boolean).map(tag=><span key={tag}>{tag.startsWith('#')?tag:'#'+tag}</span>)}</div>;
}
