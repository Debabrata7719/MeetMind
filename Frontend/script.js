const API_BASE="http://127.0.0.1:8000";  
// For local host

// const API_BASE="https://bungee-moonlike-almighty.ngrok-free.dev";  
// For ngrok using change continuously

/* ================= ELEMENTS ================= */
const dropZone=document.getElementById("dropZone");
const fileInput=document.getElementById("fileInput");
const uploadBtn=document.getElementById("uploadBtn");
const uploadStatus=document.getElementById("uploadStatus");
const notesBtn=document.getElementById("notesBtn");
const downloadBtn=document.getElementById("downloadBtn");
const notesOutput=document.getElementById("notesOutput");
const chatMessages=document.getElementById("chatMessages");
const chatForm=document.getElementById("chatForm");
const chatInput=document.getElementById("chatInput");
const sendBtn=document.getElementById("sendBtn");
const apiStatus=document.getElementById("apiStatus");
const loaderOverlay=document.getElementById("loaderOverlay");
const loaderText=document.getElementById("loaderText");
const recStatus=document.getElementById("recStatus");
const downloadModal=document.getElementById("downloadModal");
const activeMeetingLabel=document.getElementById("activeMeetingLabel");
const recordTimer=document.getElementById("recordTimer");

/* ================= STATE ================= */
let selectedFile=null;
let meetingReady=false;
let currentMeetingId=null;
let timerInterval=null;
let secondsElapsed=0;

/* ================= TIMER ================= */
function startTimer(){
  secondsElapsed=0;
  recordTimer.textContent="00:00";
  timerInterval=setInterval(()=>{
    secondsElapsed++;
    const mins=String(Math.floor(secondsElapsed/60)).padStart(2,"0");
    const secs=String(secondsElapsed%60).padStart(2,"0");
    recordTimer.textContent=`${mins}:${secs}`;
  },1000);
}
function stopTimer(){clearInterval(timerInterval)}

/* ================= LOADER ================= */
function showLoader(text="Processing..."){
  loaderText.textContent=text;
  loaderOverlay.classList.remove("hidden");
}
function hideLoader(){loaderOverlay.classList.add("hidden")}

/* ================= UI HELPERS ================= */
function setMeetingReady(v){
  meetingReady=v;
  notesBtn.disabled=!v;
  downloadBtn.disabled=!v;
  chatInput.disabled=!v;
  sendBtn.disabled=!v;
  apiStatus.querySelector("span:last-child").textContent=
    v?"API: Ready":"API: Waiting";
}

function setActiveMeeting(name){
  activeMeetingLabel.innerHTML=`
    <span class="info-dot"></span>
    <span class="info-text"><strong>${name}</strong></span>
    <span class="info-badge">Active</span>`;
}

function addMessage(text,role){
  const msg=document.createElement("div");
  msg.className=`message ${role}`;
  msg.textContent=text;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop=chatMessages.scrollHeight;
  return msg;
}

function clearChat(){chatMessages.innerHTML=""}

/* ================= TYPING INDICATOR ================= */
function showTypingIndicator(){
  const el=document.createElement("div");
  el.className="message assistant typing-indicator";
  el.innerHTML="<span></span><span></span><span></span>";
  chatMessages.appendChild(el);
  chatMessages.scrollTop=chatMessages.scrollHeight;
  return el;
}

/* ================= HISTORY ================= */
async function loadHistory(){
  try{
    const res=await fetch(`${API_BASE}/meetings`);
    const meetings=await res.json();
    const container=document.getElementById("historyList");
    if(!container) return;
    container.innerHTML="";

    if(!meetings.length){
      container.innerHTML='<div class="empty-state">No meetings yet. Record or upload to get started.</div>';
      return;
    }

    meetings.forEach(m=>{
      const div=document.createElement("div");
      div.className="history-item";
      div.textContent=m.name;
      div.style.cursor="pointer";
      div.onclick=()=>{
        document.querySelectorAll(".history-item")
          .forEach(el=>el.classList.remove("active"));
        div.classList.add("active");
        currentMeetingId=m.id;
        setMeetingReady(true);
        setActiveMeeting(m.name);
        notesOutput.innerHTML='<div class="empty-state">Meeting loaded. Click Generate for highlights.</div>';
        clearChat();
        addMessage(`Loaded meeting: ${m.name}`,"assistant");
      };
      container.appendChild(div);
    });
  }catch(err){
    console.error("History error:",err);
  }
}

/* ================= NAME MODAL ================= */
function askMeetingName(){
  document.getElementById("nameModal").classList.remove("hidden");
}

async function submitMeetingName(){
  const input=document.getElementById("meetingNameInput");
  let name=input.value.trim();
  if(!name) name="Untitled Meeting";

  await fetch(`${API_BASE}/set-meeting-name`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({meeting_id:currentMeetingId,name:name})
  });

  document.getElementById("nameModal").classList.add("hidden");
  setActiveMeeting(name);
  loadHistory();
}

/* ================= RECORDING ================= */
async function startRecording(){
  try{
    recStatus.textContent="Recording...";
    recStatus.className="status recording";
    setMeetingReady(false);
    startTimer();
    await fetch(`${API_BASE}/start-recording`,{method:"POST"});
  }catch{
    recStatus.textContent="Failed";
    recStatus.className="status muted";
    stopTimer();
  }
}

async function stopRecording(){
  try{
    stopTimer();
    recStatus.textContent="Processing...";
    recStatus.className="status processing";

    const res=await fetch(`${API_BASE}/stop-recording`,{method:"POST"});
    if(!res.ok) throw new Error();

    const data=await res.json();
    currentMeetingId=data.meeting_id;
    askMeetingName();

    recStatus.textContent="Ready";
    recStatus.className="status ready";
    setMeetingReady(true);

    notesOutput.innerHTML='<div class="empty-state">Ready to generate highlights.</div>';
    clearChat();
    addMessage("Meeting processed successfully!","assistant");
  }catch{
    recStatus.textContent="Failed";
    recStatus.className="status muted";
  }
}

/* ================= FILE SELECT ================= */
function handleFileSelection(file){
  if(!file) return;
  selectedFile=file;
  uploadStatus.textContent=`Selected: ${file.name}`;
}

/* Click anywhere on dropzone opens file picker */
dropZone.addEventListener("click",(e)=>{
  if(e.target===fileInput) return;
  fileInput.click();
});

/* Drag & drop support */
dropZone.addEventListener("dragover",(e)=>{
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave",()=>{
  dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop",e=>{
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFileSelection(e.dataTransfer.files[0]);
});

fileInput.addEventListener("change",e=>{
  handleFileSelection(e.target.files[0]);
});

/* ================= UPLOAD ================= */
uploadBtn.addEventListener("click",async()=>{
  if(!selectedFile){
    uploadStatus.textContent="Select file first";
    return;
  }

  showLoader("Processing meeting...");
  const fd=new FormData();
  fd.append("file",selectedFile);

  try{
    const res=await fetch(`${API_BASE}/upload`,{method:"POST",body:fd});
    if(!res.ok) throw new Error();

    const data=await res.json();
    currentMeetingId=data.meeting_id;
    askMeetingName();
    setMeetingReady(true);

    notesOutput.innerHTML='<div class="empty-state">Ready to generate highlights.</div>';
    clearChat();
    addMessage("Meeting uploaded successfully!","assistant");
  }catch{
    uploadStatus.textContent="Upload failed.";
  }finally{
    hideLoader();
  }
});

/* ================= NOTES (with line-by-line animation) ================= */
notesBtn.addEventListener("click",async()=>{
  if(!currentMeetingId) return;
  showLoader("Generating highlights...");

  try{
    const res=await fetch(`${API_BASE}/notes`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({meeting_id:currentMeetingId})
    });

    const data=await res.json();
    const text=data.notes||"No notes.";

    /* Animate highlights line by line */
    notesOutput.innerHTML="";
    const lines=text.split("\n");
    lines.forEach((line,i)=>{
      if(!line.trim()) return;
      const p=document.createElement("p");
      p.className="highlight-line";
      p.textContent=line;
      p.style.animationDelay=`${i*0.06}s`;
      notesOutput.appendChild(p);
    });

  }catch{
    notesOutput.textContent="Failed to generate notes.";
  }finally{
    hideLoader();
  }
});

/* ================= DOWNLOAD DROPDOWN ================= */
downloadBtn.addEventListener("click",(e)=>{
  e.stopPropagation();
  if(!currentMeetingId) return;
  downloadModal.classList.toggle("hidden");
});

/* Close dropdown on outside click */
document.addEventListener("click",(e)=>{
  if(downloadModal && !downloadModal.classList.contains("hidden")){
    if(!downloadModal.contains(e.target) && e.target!==downloadBtn){
      downloadModal.classList.add("hidden");
    }
  }
});

function closeDownloadModal(){downloadModal.classList.add("hidden")}

function downloadFile(format){
  downloadModal.classList.add("hidden");
  window.open(
    `${API_BASE}/download-notes?meeting_id=${currentMeetingId}&format=${format}`,
    "_blank"
  );
}

/* ================= CHAT (with typing indicator) ================= */
chatForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const q=chatInput.value.trim();
  if(!q||!currentMeetingId) return;

  addMessage(q,"user");
  chatInput.value="";

  const typing=showTypingIndicator();

  try{
    const res=await fetch(`${API_BASE}/chat`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({question:q,meeting_id:currentMeetingId})
    });
    const data=await res.json();
    typing.remove();
    addMessage(data.answer||"No response","assistant");
  }catch{
    typing.remove();
    addMessage("Chat failed.","assistant");
  }
});

/* ================= INIT ================= */
setMeetingReady(false);
loadHistory();
