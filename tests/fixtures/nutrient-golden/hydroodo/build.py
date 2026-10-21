import json
D=json.load(open('export/hydroodo_db.json'))
F={e['name']:(e['factor_to_element'] or 1.0,e['group']) for e in D['elements']}
C=D['components']; S=D['systems']
def contrib(idxs,doses):
    out={}; nf={'NO3':0,'NH4':0,'NH2':0}
    for i,d in zip(idxs,doses):
        for k,v in C[i]['declared_pct'].items():
            f,g=F[k]; out[g]=out.get(g,0)+d*v*f*10
            if k in nf: nf[k]+=d*v*10
    return out,nf
cases=[
("case01_ghe_w2_flora3",[65,66,62],5,0,[1.309,0.479,1.707],71.02,(91,9,0),[71,71,71,68,67,59,58,58,58,58,57,56,46,44,14]),
("case02_ghe_w6_flora3",[65,66,62],8,0,[2.429,0.719,2.436],68.63,(90,10,0),[69,69,69,61,55,55,55,49,42,13]),
("case03_ghe_w10_flora3",[65,66,62],12,0,[2.869,0.185,3.399],76.43,(88,12,0),[76,73,73,69,65,64,64,63,62,52,51,51]),
("case04_olk_veg_salts",[112,107,114,111,109,116],0,0,[0.709,0.25,0.569,0.079,0.21,0.004],88.15,(100,0,0),None),
("case05_olk_bloom_salts",[112,107,114,111,109,116],1,0,[0.379,0.509,0.469,0.07,0.18,0.004],88.47,(100,0,0),None),
("case06_samosa_grow2_an_ph",[27,10,26],15,0,[0,0.749,3.071],58.65,(93,0,7),[59,59,48,40,40,30,10]),
("case07_samosa_bloom68_an_sensi",[11,14,10],19,0,[0,3.011,0.579],60.91,(87,0,13),[61,60,59,26,22]),
("case08_olk_veg_master181818",[97,91,114,105],0,0,[0.669,0.589,0.459,0.007],89.69,(28,19,52),None),
("case09_ghe_w2_floraduo",[63,64],5,0,[0,1.619],40.15,(0,0,0),[40,20]),
("case10_olk_bloom_aquarin",[118,112,114],1,0,[0.299,0.21,0.479],54.22,(39,0,0),None),
("case11_ghe_w2_flora3_min60",[65,66,62],5,60,None,0,(0,0,0),[]),
("case12_olk_veg_salts_min50",[112,107,114,111,109,116],0,50,None,0,(0,0,0),[]),
("case13_olk_bloom13_valagro",[102,101,112,114,105],2,0,[0.459,0.2,0.16,0.505,0.019],77.99,(62,38,0),None),
("case14_samosa_night_flora3",[65,66,62],20,0,[0,0.559,3.21],57.12,(94,6,0),[57,57,52,34,33,28,8]),
]
shown_macros={ # N,P,K,Ca,Mg,S "Компоненты" as shown
"case01_ghe_w2_flora3":[50.13,42.91984,125.8363,17.12425,32.15,17.07],
"case02_ghe_w6_flora3":[84.53,63.69524,207.8071,25.70425,48.685,24.36],
"case03_ghe_w10_flora3":[66.63,86.60704,257.2585,6.61375,65.33,33.99],
"case04_olk_veg_salts":[105.134,54.5,103.2271,117.7968,76.150458,76.815],
"case05_olk_bloom_salts":[63.584,110.962,170.2081,63.0168,63.421128,63.315],
"case06_samosa_grow2_an_ph":[45.69,40.16868,101.9572,17.976,0.749,30.71],
"case07_samosa_bloom68_an_sensi":[71.8,52.51184,199.9304,13.896,0.579,33.121],
"case08_olk_veg_master181818":[120.42,52.50312,99.9486,90.96516,57.493638,78.021],
"case09_ghe_w2_floraduo":[None,28.23536,34.93802,None,22.666,25.904],
"case10_olk_bloom_aquarin":[63.23,6.5182,62.0425,34.86,50.975208,64.665],
"case13_olk_bloom13_valagro":[90.46,70.90232,143.4904,26.56,49.94046,85.263],
"case14_samosa_night_flora3":[27.95,69.978,111.2117,19.98425,48.15,32.1],
}
full_dev={ # full element table read from screenshot (case01-03)
"case01_ghe_w2_flora3":{"N":-47,"P":15,"K":0,"Ca":30,"Mg":25,"S":-48,"B":-100,"Fe":-70,"Mn":-64,"Zn":-100,"Cu":-100,"Mo":-90,"Co":-82},
"case02_ghe_w6_flora3":{"N":-47,"P":20,"K":-5,"Ca":30,"Mg":30,"S":-51,"B":-100,"Fe":-70,"Mn":-64,"Zn":-100,"Cu":-100,"Mo":-88,"Co":-64},
"case03_ghe_w10_flora3":{"N":0,"P":-24,"K":20,"Ca":0,"Mg":-13,"S":-62,"B":-100,"Fe":-77,"Mn":-72,"Zn":-100,"Cu":-100,"Mo":-85,"Co":100},
}
out=[];maxerr=0
for cid,idx,si,mn,doses,match,nsplit,variants in cases:
    sysd=S[si]
    rec=dict(id=cid,source="hydroodo_0.4b18_gui",
      inputs=dict(target_system=sysd['name'],target_mg_l=sysd['ppm'],water=None,volume_l=2.0,
        min_match_pct=mn,overdose_pct={o['group']:o['max_overdose_pct'] for o in D['overdose']},
        fertilizers=[dict(db_index=i,brand=C[i]['brand'],name=C[i]['name'],declared_pct=C[i]['declared_pct']) for i in idx]),
      screenshot=f"screens/{cid}.png" if cid!="case01_ghe_w2_flora3" else "screens/case01_var1.png")
    if doses is None:
        rec['outputs']=dict(status="no_variants",note="Список вариантов пуст, дозы 0 (скрин)"); out.append(rec); continue
    got,nf=contrib(idx,doses)
    els={}
    for g in sorted(set(got)|set(sysd['ppm'])):
        t=sysd['ppm'].get(g); v=got.get(g)
        els[g]=dict(target=t,computed_from_doses=round(v,6) if v else None,
                    deviation_pct_calc=round((v or 0)/t*100-100,2) if t else None)
    macro=dict(zip(['N','P','K','Ca','Mg','S'],shown_macros[cid]))
    for g,v in macro.items():
        if v is not None:
            els[g]['shown']=v; e=abs(els[g]['computed_from_doses']-v); maxerr=max(maxerr,e/max(v,1e-9))
    if cid in full_dev:
        for g,d in full_dev[cid].items(): els[g]['deviation_pct_shown']=d
    rec['outputs']=dict(status="ok",variant_shown=1,variant_match_pct_list=variants,
        doses_g_or_ml_per_l=[dict(name=C[i]['name'],dose=d) for i,d in zip(idx,doses)],
        match_pct=match,n_forms_pct_shown=dict(zip(['NO3','NH4','NH2'],nsplit)),elements_mg_l=els)
    out.append(rec)
json.dump(dict(generator="Hydroodo 0.4 beta build 18 under Wine 10 (LANG=ru_RU.UTF-8)",
  units=dict(dose="g or ml per 1 L (column 'г. мл./литр')",elements="mg/L",declared="% as in DB"),cases=out),
  open('golden/cases.json','w'),ensure_ascii=False,indent=1)
print('max rel err shown vs computed',maxerr)
# match% hypothesis
import statistics
for r in out:
    o=r['outputs']
    if o['status']!='ok': continue
    e=o['elements_mg_l']; tg=[g for g in e if e[g]['target']]
    def m(gs): return statistics.mean(max(0,100-abs(e[g]['deviation_pct_calc'])) for g in gs)
    mac=[g for g in tg if g in('N','P','K','Ca','Mg','S')]
    print(r['id'],o['match_pct'],'all',round(m(tg),2),'macro',round(m(mac),2))
