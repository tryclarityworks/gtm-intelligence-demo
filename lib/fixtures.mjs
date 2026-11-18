export const campaign = {
  slug:'workflow-research', name:'Workflow research', version:1,
  scoring_dimensions:[
    {key:'segment',label:'Segment fit',weight:25},
    {key:'workflow',label:'Workflow evidence',weight:30},
    {key:'timing',label:'Change signal',weight:20},
    {key:'owner',label:'Decision ownership',weight:15},
    {key:'route',label:'Conversation route',weight:10}
  ]
};
const evidence=(id,excerpt)=>({id,source_title:'Fictional scenario written for this demo',source_url:`demo://scenario/${id}`,source_type:'synthetic',excerpt,observed_at:'2026-11-17T00:00:00Z',verified_status:'verified',reliability:'primary',demo:true});
const rating=(dimension_key,rating,id)=>({dimension_key,rating,evidence_ids:[id],reviewed:true,reason:'Reviewed synthetic scenario'});
const base=(id,name)=>({id,name:`DEMO ${name}`,campaign_slug:campaign.slug,demo:true,exclusion:'none',suppressed:false,evidence:[],reviewed_dimension_ratings:[],contact_basis:'Fictional demonstration review only; no real contact permission.',hypothesis:'A relevant workflow may be worth a discovery conversation; need and budget are unverified.',next_action:'Review missing evidence before deciding whether a real discovery conversation would be appropriate.'});
export const accounts=[
  {...base('cedar','Cedar Studio'),evidence:[evidence('cedar-product','This fictional B2B team sells a workflow application.'),evidence('cedar-workflow','Its invented documentation describes manual account research and review.'),evidence('cedar-timing','An invented hiring brief mentions extending internal research workflows.')],reviewed_dimension_ratings:[rating('segment',1,'cedar-product'),rating('workflow',1,'cedar-workflow'),rating('timing',0.5,'cedar-timing')]},
  {...base('harbor','Harbor Lab'),evidence:[evidence('harbor-product','This fictional B2B application serves operations teams.'),evidence('harbor-workflow','The synthetic product note describes a matching research workflow.')],reviewed_dimension_ratings:[rating('segment',1,'harbor-product'),rating('workflow',1,'harbor-workflow')]},
  {...base('birch','Birch Supply'),exclusion:'verified',evidence:[evidence('birch-product','This fictional account matches the segment but is explicitly excluded from the example campaign.')],reviewed_dimension_ratings:[rating('segment',1,'birch-product')]},
  {...base('meadow','Meadow Office'),hypothesis:'There is insufficient reviewed evidence to form a useful account hypothesis.'}
];
