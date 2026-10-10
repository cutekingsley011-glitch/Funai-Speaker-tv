import {useState} from 'react';
import {api} from '@appdeploy/client';
import {CalendarDays,Download,Edit3,Plus,Trash2,Users,Clock,Database,FolderCog,ImagePlus,Upload} from 'lucide-react';
type AnyItem={id:string;name?:string;email?:string;joinedAt?:number;title?:string;description?:string;date?:string;time?:string;location?:string;bio?:string;image?:string;action?:string;detail?:string};
const token=()=>localStorage.getItem('fstv-admin-token')||'';
export function MembersAdmin({members,onReload}:{members:AnyItem[];onReload?:()=>void}){
  const[search,setSearch]=useState('');
  const[filterRole,setFilterRole]=useState('ALL');
  const[showAddModal,setShowAddModal]=useState(false);
  const[editingMember,setEditingMember]=useState<AnyItem|null>(null);
  const[submitting,setSubmitting]=useState(false);
  const[form,setForm]=useState({
    name:'',
    email:'',
    role:'Member',
    department:'Mass Communication',
    faculty:'Humanities & Social Sciences',
    level:'300 Level',
    phone:'',
    status:'Active',
    notes:''
  });

  const ordered=[...members].sort((a,b)=>Number(b.joinedAt||0)-Number(a.joinedAt||0));

  const filtered=ordered.filter(m=>{
    const q=search.toLowerCase().trim();
    const matchSearch=!q || 
      (m.name||'').toLowerCase().includes(q) || 
      (m.email||'').toLowerCase().includes(q) || 
      (m.department||'').toLowerCase().includes(q) || 
      (m.role||'').toLowerCase().includes(q) ||
      (m.level||'').toLowerCase().includes(q);
    const matchRole=filterRole==='ALL' || (m.role||'').toLowerCase().includes(filterRole.toLowerCase()) || (m.status||'').toLowerCase().includes(filterRole.toLowerCase()) || (m.faculty||'').toLowerCase().includes(filterRole.toLowerCase()) || (m.department||'').toLowerCase().includes(filterRole.toLowerCase());
    return matchSearch && matchRole;
  });

  function exportMembers(){
    const blob=new Blob([JSON.stringify(ordered,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='funai-speaker-tv-members.json';
    a.click();
  }

  function openCreate(){
    setEditingMember(null);
    setForm({
      name:'',
      email:'',
      role:'Member',
      department:'Mass Communication',
      faculty:'Humanities & Social Sciences',
      level:'300 Level',
      phone:'',
      status:'Active',
      notes:''
    });
    setShowAddModal(true);
  }

  function openEdit(m:AnyItem){
    setEditingMember(m);
    setForm({
      name:m.name||'',
      email:m.email||'',
      role:m.role||'Member',
      department:m.department||'',
      faculty:m.faculty||'',
      level:m.level||'300 Level',
      phone:m.phone||'',
      status:m.status||'Active',
      notes:m.notes||''
    });
    setShowAddModal(true);
  }

  async function handleSave(e:React.FormEvent){
    e.preventDefault();
    if(!form.name.trim())return;
    setSubmitting(true);
    try{
      const adminToken=token();
      if(editingMember){
        await api.put(`/api/admin/members/${editingMember.id}`,{...form,token:adminToken});
      }else{
        await api.post('/api/admin/members',{...form,token:adminToken});
      }
      setShowAddModal(false);
      onReload?.();
    }catch(err){
      console.error(err);
    }finally{
      setSubmitting(false);
    }
  }

  async function handleDelete(m:AnyItem){
    if(!window.confirm(`Remove member record for ${m.name}?`))return;
    try{
      await api.delete(`/api/admin/members/${m.id}?token=${token()}`);
      onReload?.();
    }catch(err){
      console.error(err);
    }
  }

  return <section className='admin-section'>
    <div className='section-header'>
      <div>
        <span className='admin-eyebrow'>COMMUNITY & REGISTRY</span>
        <h2>Formal Member Records</h2>
        <p>Verified AE-FUNAI students, campus ambassadors, editorial staff, and official members.</p>
      </div>
      <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
        <button className='admin-secondary' onClick={exportMembers}><Download size={16}/> Export ({ordered.length})</button>
        <button className='admin-primary' onClick={openCreate}><Plus size={16}/> Add Member Record</button>
      </div>
    </div>

    <div className='audience-hero'>
      <div><Users/><b>{ordered.length}</b><span>total registered members</span></div>
      <div><Clock/><b>{filtered.length}</b><span>matching filter</span></div>
    </div>

    <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem',marginBottom:'1rem',flexWrap:'wrap'}}>
      <input 
        type="text" 
        placeholder="Search member by name, department, role or email..." 
        value={search} 
        onChange={e=>setSearch(e.target.value)}
        style={{flex:1,minWidth:'240px',padding:'0.65rem 1rem',borderRadius:'8px',border:'1px solid var(--line,#2a2a2a)',background:'var(--surface,#161616)',color:'inherit',fontSize:'0.9rem'}}
      />
      <select 
        value={filterRole} 
        onChange={e=>setFilterRole(e.target.value)}
        style={{padding:'0.65rem 1rem',borderRadius:'8px',border:'1px solid var(--line,#2a2a2a)',background:'var(--surface,#161616)',color:'inherit',fontSize:'0.9rem'}}
      >
        <option value="ALL">All Members & Roles</option>
        <option value="Executive">Executive / Management</option>
        <option value="Formal">Formal Members</option>
        <option value="Desk">Editorial Desk / Press</option>
        <option value="Science">Faculty of Science</option>
        <option value="Humanities">Faculty of Humanities</option>
      </select>
    </div>

    <div className='subscriber-table'>
      {filtered.length ? filtered.map((m,i)=>(
        <div className='subscriber' key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem',padding:'0.85rem 1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.85rem',minWidth:0}}>
            <div className='subscriber-avatar' style={{background:'linear-gradient(135deg, #e11d48, #be123c)',color:'#fff',fontWeight:700,width:'40px',height:'40px',borderRadius:'50%',display:'grid',placeItems:'center',flexShrink:0}}>
              {(m.name||'M')[0].toUpperCase()}
            </div>
            <div style={{minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap'}}>
                <b style={{fontSize:'1rem'}}>{m.name}</b>
                {m.role && <span style={{fontSize:'0.75rem',padding:'2px 8px',borderRadius:'999px',background:'rgba(225,29,72,0.15)',color:'#fb7185',border:'1px solid rgba(225,29,72,0.3)',fontWeight:600}}>{m.role}</span>}
                {m.status && <span style={{fontSize:'0.72rem',padding:'2px 6px',borderRadius:'4px',background:'rgba(34,197,94,0.12)',color:'#4ade80'}}>{m.status}</span>}
              </div>
              <div style={{fontSize:'0.8rem',opacity:0.75,marginTop:'2px'}}>
                {m.department ? `${m.department} · ` : ''}{m.level ? `${m.level} · ` : ''}{m.faculty ? `${m.faculty} · ` : ''}Joined {m.joinedDate || (m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'Recently')}
              </div>
              {m.email && <div style={{fontSize:'0.78rem',opacity:0.6}}>{m.email} {m.phone ? `· ${m.phone}` : ''}</div>}
              {m.notes && <div style={{fontSize:'0.76rem',opacity:0.55,fontStyle:'italic',marginTop:'2px'}}>Note: {m.notes}</div>}
            </div>
          </div>
          <div style={{display:'flex',gap:'0.4rem',flexShrink:0}}>
            <button className='admin-secondary' style={{padding:'6px 10px'}} onClick={()=>openEdit(m)} title="Edit member record"><Edit3 size={15}/></button>
            <button className='admin-secondary' style={{padding:'6px 10px',color:'#f43f5e'}} onClick={()=>handleDelete(m)} title="Delete record"><Trash2 size={15}/></button>
          </div>
        </div>
      )) : (
        <Empty title='No matching member records' text='Add formal member records or adjust search filters.'/>
      )}
    </div>

    {showAddModal && (
      <div className='modal-backdrop' style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'grid',placeItems:'center',zIndex:999,padding:'1rem'}}>
        <div className='modal' style={{maxWidth:'540px',width:'100%',background:'var(--surface,#18181b)',borderRadius:'12px',border:'1px solid var(--line,#27272a)',padding:'1.5rem',maxHeight:'90vh',overflowY:'auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <h3 style={{margin:0,fontSize:'1.2rem'}}>{editingMember ? 'Edit Formal Member Record' : 'Add Formal Member Record'}</h3>
            <button style={{background:'none',border:'none',color:'inherit',cursor:'pointer',fontSize:'1.2rem'}} onClick={()=>setShowAddModal(false)}>✕</button>
          </div>
          <form onSubmit={handleSave} style={{display:'flex',flexDirection:'column',gap:'0.85rem'}}>
            <div>
              <label style={{display:'block',fontSize:'0.8rem',marginBottom:'4px',opacity:0.8}}>Full Name *</label>
              <input required style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'6px',border:'1px solid #333',background:'#222',color:'#fff'}} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="e.g. Kingsley (CEO / Founder) or Student Name"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
              <div>
                <label style={{display:'block',fontSize:'0.8rem',marginBottom:'4px',opacity:0.8}}>Official Role / Title</label>
                <input style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'6px',border:'1px solid #333',background:'#222',color:'#fff'}} value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))} placeholder="e.g. Lead Ambassador, SUG Press"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'0.8rem',marginBottom:'4px',opacity:0.8}}>Status</label>
                <select style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'6px',border:'1px solid #333',background:'#222',color:'#fff'}} value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value}))}>
                  <option value="Active">Active</option>
                  <option value="Executive">Executive</option>
                  <option value="Alumni">Alumni</option>
                  <option value="Honorary">Honorary</option>
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
              <div>
                <label style={{display:'block',fontSize:'0.8rem',marginBottom:'4px',opacity:0.8}}>Department</label>
                <input style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'6px',border:'1px solid #333',background:'#222',color:'#fff'}} value={form.department} onChange={e=>setForm(v=>({...v,department:e.target.value}))} placeholder="e.g. Mass Comm, Computer Science"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'0.8rem',marginBottom:'4px',opacity:0.8}}>Level</label>
                <select style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'6px',border:'1px solid #333',background:'#222',color:'#fff'}} value={form.level} onChange={e=>setForm(v=>({...v,level:e.target.value}))}>
                  <option value="100 Level">100 Level</option>
                  <option value="200 Level">200 Level</option>
                  <option value="300 Level">300 Level</option>
                  <option value="400 Level">400 Level</option>
                  <option value="500 Level">500 Level</option>
                  <option value="Postgraduate">Postgraduate</option>
                  <option value="Staff/Executive">Staff / Executive</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:'0.8rem',marginBottom:'4px',opacity:0.8}}>Faculty</label>
              <input style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'6px',border:'1px solid #333',background:'#222',color:'#fff'}} value={form.faculty} onChange={e=>setForm(v=>({...v,faculty:e.target.value}))} placeholder="e.g. Humanities & Social Sciences, Science, Engineering"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
              <div>
                <label style={{display:'block',fontSize:'0.8rem',marginBottom:'4px',opacity:0.8}}>Email Address</label>
                <input type="email" style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'6px',border:'1px solid #333',background:'#222',color:'#fff'}} value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))} placeholder="student@funaispeakertv.ng"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:'0.8rem',marginBottom:'4px',opacity:0.8}}>Phone / WhatsApp</label>
                <input style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'6px',border:'1px solid #333',background:'#222',color:'#fff'}} value={form.phone} onChange={e=>setForm(v=>({...v,phone:e.target.value}))} placeholder="+234..."/>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:'0.8rem',marginBottom:'4px',opacity:0.8}}>Notes / Roles & Duties</label>
              <textarea rows={2} style={{width:'100%',padding:'0.6rem 0.8rem',borderRadius:'6px',border:'1px solid #333',background:'#222',color:'#fff'}} value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} placeholder="Campus beats, editorial permissions, SUG coverage..."/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'0.75rem',marginTop:'0.5rem'}}>
              <button type="button" className='admin-secondary' onClick={()=>setShowAddModal(false)}>Cancel</button>
              <button type="submit" className='admin-primary' disabled={submitting}>{submitting ? 'Saving...' : (editingMember ? 'Update Record' : 'Save Member Record')}</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </section>;
}
export function EventsAdmin({events,onReload}:{events:AnyItem[];onReload:()=>void}){const[form,setForm]=useState({title:'',description:'',date:'',time:'',location:'',image:''});const[editing,setEditing]=useState<string|null>(null);const[imageName,setImageName]=useState('');async function pickImage(e:any){const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=async()=>{try{const r=await api.post('/api/upload',{filename:f.name,contentType:f.type,data:String(reader.result).split(',')[1],token:token()});setForm(v=>({...v,image:r.data.url}));setImageName(f.name)}catch{setImageName('Upload failed')}};reader.readAsDataURL(f)}async function save(){if(!form.title.trim()||!form.date)return; if(!form.image)return;try{if(editing)await api.put(`/api/admin/events/${editing}`,{...form,token:token()});else await api.post('/api/admin/events',{...form,token:token()});setForm({title:'',description:'',date:'',time:'',location:'',image:''});setImageName('');setEditing(null);onReload()}catch{}}async function remove(id:string){if(!window.confirm('Delete this event?'))return;await api.delete(`/api/admin/events/${id}`,{token:token()});onReload()}return <section className='admin-section'><div className='section-header'><div><span className='admin-eyebrow'>CAMPUS</span><h2>Events</h2><p>Create, edit and remove public campus events.</p></div></div><div className='admin-two-col'><div className='side-card'><h3>{editing?'Edit event':'Create event'}</h3><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder='Event title'/><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder='Description' rows={4}/><input type='date' value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><input type='time' value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder='Venue / location'/><label className='cover-drop'><ImagePlus/><b>{form.image?'Replace event image':'Upload event image *'}</b><small>JPG, PNG or WEBP · Required</small><input type='file' accept='image/*' required onChange={pickImage}/></label>{imageName&&<small className='muted'>{imageName}</small>}{form.image&&<img className='cover-preview' src={form.image} alt='Event preview'/>}<button className='admin-primary full' disabled={!form.image} onClick={save}>{editing?<Edit3/>:<Plus/>}{editing?'Update event':'Create event'}</button></div><div className='event-grid'>{events.map(e=><article className='event-card' key={e.id}>{e.image&&<img className='cover-preview' src={e.image} alt='Event'/>}<CalendarDays/><span>{e.date} • {e.time}</span><h3>{e.title}</h3><p>{e.description}</p><small>📍 {e.location}</small><div className='post-actions'><button onClick={()=>{setEditing(e.id);setForm({title:e.title||'',description:e.description||'',date:e.date||'',time:e.time||'',location:e.location||'',image:e.image||''});setImageName(e.image?'Current image':'')}}><Edit3/> Edit</button><button onClick={()=>remove(e.id)}><Trash2/> Delete</button></div></article>)}</div></div></section>}
export function CategoriesAdmin({categories,onReload}:{categories:AnyItem[];onReload:()=>void}){const[name,setName]=useState('');async function add(){if(!name.trim())return;await api.post('/api/admin/categories',{name:name.trim(),token:token()});setName('');onReload()}async function remove(id:string){if(!window.confirm('Delete this category?'))return;await api.delete(`/api/admin/categories/${id}`,{token:token()});onReload()}return <section className='admin-section'><div className='section-header'><div><span className='admin-eyebrow'>CONTENT</span><h2>Categories</h2><p>Manage newsroom topics.</p></div></div><div className='side-card'><div className='admin-toolbar'><input value={name} onChange={e=>setName(e.target.value)} placeholder='New category name'/><button className='admin-primary' onClick={add}><Plus/> Add</button></div><div className='story-list'>{categories.map(c=><div className='story-item' key={c.id}><div className='story-info'><b>{c.name}</b><span>Newsroom category</span></div><button className='danger-icon' onClick={()=>remove(c.id)}><Trash2/></button></div>)}</div></div></section>}
export function ActivityAdmin({activities}:{activities:AnyItem[]}){return <section className='admin-section'><div className='section-header'><div><span className='admin-eyebrow'>SECURITY</span><h2>Admin activity</h2><p>A record of important newsroom actions.</p></div></div><div className='comment-admin-list'>{activities.length?activities.map(a=><article className='comment-admin' key={a.id}><div className='comment-avatar'><Database size={16}/></div><div className='comment-copy'><div><b>{a.action||a.name||a.title||'Admin action'}</b><span>{a.time?new Date(a.time).toLocaleString():a.joinedAt?new Date(a.joinedAt).toLocaleString():''}</span></div><p>{a.detail||a.bio||a.description||''}</p></div></article>):<Empty title='No activity yet' text='Important newsroom actions will appear here.'/ >}</div></section>}
export function BrandingAdmin(){const[preview,setPreview]=useState('');const[message,setMessage]=useState('');async function choose(e:any){const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>setPreview(String(reader.result));reader.readAsDataURL(f)}async function save(){if(!preview)return;try{const parts=preview.split(',');const contentType=parts[0].match(/:(.*?);/)?.[1]||'image/png';const r=await api.post('/api/admin/branding',{data:parts[1],contentType,token:token()});setMessage(r.data?.logoUrl?'Logo updated successfully':'Logo upload failed')}catch{setMessage('Logo upload failed')}}return <section className='admin-section'><div className='section-header'><div><span className='admin-eyebrow'>BRANDING</span><h2>Site logo</h2><p>Upload the logo that replaces the default FS mark across FUNAI SPEAKER TV.</p></div></div><div className='side-card'><label className='cover-drop'><ImagePlus/><b>{preview?'Choose another logo':'Choose logo from your device'}</b><small>Tap here on iPhone/Android to open Photos or Files · PNG, JPG or WEBP</small><input type='file' accept='image/png,image/jpeg,image/webp' onChange={choose}/></label>{preview&&<img className='cover-preview' src={preview} alt='Logo preview'/>}<button className='admin-primary full' disabled={!preview} onClick={save}><Upload/> Save logo</button>{message&&<p className='muted'>{message}</p>}</div></section>}
export function BackupAdmin({data}:{data:any}){function download(){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fstv-newsroom-backup-${new Date().toISOString().slice(0,10)}.json`;a.click()}return <section className='admin-section'><div className='section-header'><div><span className='admin-eyebrow'>RECOVERY</span><h2>Backup & export</h2><p>Download a copy of newsroom content and audience records.</p></div></div><div className='settings-grid'><div className='settings-card'><FolderCog/><div><b>Newsroom backup</b><span>Posts, comments, polls, events, authors, members and subscribers.</span></div><button className='admin-secondary' onClick={download}><Download/> Export JSON</button></div></div><p className='muted'>Admin password and secret values are never included.</p></section>}
function Empty({title,text}:{title:string;text:string}){return <div className='admin-empty'><h3>{title}</h3><p>{text}</p></div>}
