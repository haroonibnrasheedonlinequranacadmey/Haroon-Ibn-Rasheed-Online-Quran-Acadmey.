/* Haroon Ibn Rasheed Online Quran Academy - Supabase frontend */
let hqaSupabase = null;
let hqaReadyPromise = null;

async function hqaLoadSupabase(){
  if(hqaSupabase) return hqaSupabase;
  if(!window.HQA_SUPABASE_URL || !window.HQA_SUPABASE_PUBLISHABLE_KEY){
    throw new Error("Supabase configuration is missing.");
  }
  if(window.supabase?.createClient){
    hqaSupabase=window.supabase.createClient(window.HQA_SUPABASE_URL,window.HQA_SUPABASE_PUBLISHABLE_KEY);
    return hqaSupabase;
  }
  if(hqaReadyPromise) return hqaReadyPromise;
  hqaReadyPromise=new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload=()=>{try{
      if(!window.supabase?.createClient) throw new Error("Supabase library did not initialize.");
      hqaSupabase=window.supabase.createClient(window.HQA_SUPABASE_URL,window.HQA_SUPABASE_PUBLISHABLE_KEY);
      resolve(hqaSupabase);
    }catch(e){reject(e)}};
    s.onerror=()=>reject(new Error("Supabase library could not be loaded. Check internet connection."));
    document.head.appendChild(s);
  });
  return hqaReadyPromise;
}

async function getSession(){
  const client=await hqaLoadSupabase();
  const {data,error}=await client.auth.getSession();
  if(error) throw error;
  return data.session;
}

async function getMyProfile(userId){
  const client=await hqaLoadSupabase();
  const {data,error}=await client.from("profiles")
    .select("id,full_name,email,phone,role,avatar_url,is_active")
    .eq("id",userId).maybeSingle();
  if(error) throw error;
  return data;
}

function dashboardForRole(role){
  if(role==="admin") return "admin-dashboard.html";
  if(role==="teacher") return "teacher-dashboard.html";
  return "student-dashboard.html";
}

function selectedRole(){
  return document.querySelector('input[name="role"]:checked')?.value || "teacher";
}

function showMessage(id,message,type="error"){
  const el=document.getElementById(id);
  if(!el) return;
  el.textContent=message;
  el.style.color=type==="success" ? "#147a4b" : "#b42318";
}

function friendlyAuthError(error){
  const m=String(error?.message||error||"");
  if(/invalid login credentials/i.test(m)) return "Email ya password ghalat hai.";
  if(/email not confirmed/i.test(m)) return "Is account ki email confirm nahi hui. Supabase Authentication mein email confirm karein.";
  if(/too many requests|rate limit/i.test(m)) return "Koshishen zyada ho gayi hain. Kuch dair baad dobara try karein.";
  if(/failed to fetch|network|load/i.test(m)) return "Internet ya Supabase connection ka masla hai. Dobara try karein.";
  return m || "Login nahi ho saka. Dobara try karein.";
}

async function login(e){
  e.preventDefault();
  const email=document.getElementById("email")?.value.trim().toLowerCase();
  const password=document.getElementById("password")?.value;
  const button=document.getElementById("loginButton") || e.submitter;
  if(!email || !password){showMessage("loginMsg","Email aur password dono enter karein.");return;}
  if(button){button.disabled=true;button.textContent="Signing in...";}
  showMessage("loginMsg","");
  try{
    const client=await hqaLoadSupabase();
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error) throw error;
    if(!data.user) throw new Error("Login completed but user session was not returned.");
    const profile=await getMyProfile(data.user.id);
    if(!profile){await client.auth.signOut();throw new Error("Is account ka profile database mein nahi bana.");}
    if(profile.is_active===false){await client.auth.signOut();throw new Error("Ye account inactive hai. Academy administrator se contact karein.");}

    /* Admin does not need to appear in the public role selector. */
    const wanted=selectedRole();
    if(profile.role!=="admin" && profile.role!==wanted){
      await client.auth.signOut();
      throw new Error(`Ye account ${profile.role} hai. Login page par ${profile.role} select karein.`);
    }
    showMessage("loginMsg","Login successful. Dashboard open ho raha hai.","success");
    setTimeout(()=>{window.location.href=dashboardForRole(profile.role)},250);
  }catch(err){
    console.error(err);
    showMessage("loginMsg",friendlyAuthError(err));
  }finally{
    if(button){button.disabled=false;button.textContent="Login";}
  }
}

function getResetRedirectUrl(){
  return new URL("reset-password.html",window.location.href).href;
}

async function sendPasswordReset(e){
  e.preventDefault();
  const email=document.getElementById("resetEmail")?.value.trim().toLowerCase();
  const button=document.getElementById("resetButton") || e.submitter;
  if(!email){showMessage("resetMsg","Apna registered email enter karein.");return;}
  if(button){button.disabled=true;button.textContent="Sending...";}
  showMessage("resetMsg","");
  try{
    const client=await hqaLoadSupabase();
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:getResetRedirectUrl()});
    if(error) throw error;
    showMessage("resetMsg","Reset link email par bhej diya gaya hai. Inbox aur Spam/Junk folder check karein.","success");
  }catch(err){
    console.error(err);
    showMessage("resetMsg",friendlyAuthError(err));
  }finally{
    if(button){button.disabled=false;button.textContent="Send Reset Link";}
  }
}

async function waitForRecoverySession(){
  const client=await hqaLoadSupabase();
  const existing=await getSession();
  if(existing) return existing;
  return new Promise((resolve)=>{
    let done=false;
    let sub=null;
    const finish=(session)=>{if(done)return;done=true;clearTimeout(timer);sub?.unsubscribe?.();resolve(session||null)};
    const timer=setTimeout(()=>finish(null),8000);
    const subResult=client.auth.onAuthStateChange((event,session)=>{
      if(event==="PASSWORD_RECOVERY" || session) finish(session);
    });
    sub=subResult.data.subscription;
  });
}

async function updatePassword(e){
  e.preventDefault();
  const p=document.getElementById("newPassword")?.value||"";
  const c=document.getElementById("confirmPassword")?.value||"";
  const button=document.getElementById("updatePasswordButton")||e.submitter;
  if(p.length<8){showMessage("updateMsg","Password kam az kam 8 characters ka hona chahiye.");return;}
  if(p!==c){showMessage("updateMsg","Dono passwords same nahi hain.");return;}
  if(button){button.disabled=true;button.textContent="Updating...";}
  showMessage("updateMsg","");
  try{
    const client=await hqaLoadSupabase();
    const session=await waitForRecoverySession();
    if(!session) throw new Error("Reset link expire ho gaya hai ya invalid hai. Dobara Forgot Password se reset link mangwayein.");
    const {error}=await client.auth.updateUser({password:p});
    if(error) throw error;
    showMessage("updateMsg","Password successfully update ho gaya. Login page open ho raha hai.","success");
    setTimeout(async()=>{await client.auth.signOut();window.location.href="index.html"},1200);
  }catch(err){
    console.error(err);
    showMessage("updateMsg",friendlyAuthError(err));
  }finally{
    if(button){button.disabled=false;button.textContent="Update Password";}
  }
}

function togglePassword(id,button){
  const input=document.getElementById(id);
  if(!input)return;
  const show=input.type==="password";
  input.type=show?"text":"password";
  if(button) button.textContent=show?"Hide":"Show";
}

async function logout(){
  try{await (await hqaLoadSupabase()).auth.signOut()}catch(e){console.error(e)}
  window.location.href="index.html";
}

async function requireRole(role){
  try{
    const session=await getSession();
    if(!session){window.location.href="index.html";return null;}
    const profile=await getMyProfile(session.user.id);
    if(!profile || profile.is_active===false){
      await (await hqaLoadSupabase()).auth.signOut();
      window.location.href="index.html";return null;
    }
    if(role && profile.role!==role){
      window.location.href=dashboardForRole(profile.role);return null;
    }
    return {...session.user,profile};
  }catch(err){
    console.error(err);window.location.href="index.html";return null;
  }
}

async function initRolePage(role){
  const account=await requireRole(role);
  if(!account)return null;
  const p=account.profile;
  document.querySelectorAll("[data-user-name]").forEach(x=>x.textContent=p.full_name||p.email||"User");
  document.querySelectorAll("[data-user-role]").forEach(x=>x.textContent=(p.role||"").toUpperCase());
  document.querySelectorAll("[data-user-email]").forEach(x=>x.textContent=p.email||account.email||"");
  return account;
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("[data-year]").forEach(x=>x.textContent=new Date().getFullYear());
  /* Avoid browser restoring a stale password on a shared device. */
  const password=document.getElementById("password");
  if(password) password.value="";
});
