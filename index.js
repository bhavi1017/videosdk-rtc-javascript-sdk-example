// Constants
const API_BASE_URL = "https://api.videosdk.live";

// Declaring variables
let videoContainer = document.getElementById("videoContainer");
let micButton = document.getElementById("micButton");
let camButton = document.getElementById("camButton");
let copy_meeting_id = document.getElementById("meetingid");
let contentRaiseHand = document.getElementById("contentRaiseHand");
let btnScreenShare = document.getElementById("btnScreenShare");
let videoScreenShare = document.getElementById("videoScreenShare");
let btnRaiseHand = document.getElementById("btnRaiseHand");
// let btnStopPresenting = document.getElementById("btnStopPresenting");
let btnSend = document.getElementById("btnSend");
let participantsList = document.getElementById("participantsList");
let videoCamOff = document.getElementById("main-pg-cam-off");
let videoCamOn = document.getElementById("main-pg-cam-on");

let micOn = document.getElementById("main-pg-unmute-mic");
let micOff = document.getElementById("main-pg-mute-mic");

//recording
let btnStartRecording = document.getElementById("btnStartRecording");
let btnStopRecording = document.getElementById("btnStopRecording");

//videoPlayback DIV
let videoPlayback = document.getElementById("videoPlayback");

let meeting = "";
// Local participants
let localParticipant;
let localParticipantAudio;
let createMeetingFlag = 0;
let joinMeetingFlag = 0;
let token = "";
let validateMeetingIdAnswer = "";
let micEnable = true;
let webCamEnable = true;
let totalParticipants = 0;
let remoteParticipantId = "";
let participants = [];
// join page
let joinPageWebcam = document.getElementById("joinCam");
let meetingCode = "";
let screenShareOn = false;

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: false,
  })
  .then((stream) => {
    // console.log(stream);
    joinPageWebcam.srcObject = stream;
    joinPageWebcam.play();
  });

async function tokenGeneration() {
  if (TOKEN != "" && AUTH_URL == "") {
    token = TOKEN;
    console.log(token);
  } else if (AUTH_URL != "" && TOKEN == "") {
    token = await window
      .fetch(AUTH_URL + "/generateJWTToken")
      .then(async (response) => {
        const { token } = await response.json();
        console.log(token);
        return token;
      })
      .catch(async (e) => {
        console.log(await e);
        return;
      });
  } else if (AUTH_URL == "" && TOKEN == "") {
    alert("Set Your configuration details first ");
    window.location.href = "/";
    // window.location.reload();
  } else {
    alert("Check Your configuration once ");
    window.location.href = "/";
    // window.location.reload();
  }
}

async function validateMeeting() {
  tokenGeneration();
  meetingId = document.getElementById("joinMeetingId").value;
  if (token != "") {
    const url = `${API_BASE_URL}/api/meetings/${meetingId}`;

    const options = {
      method: "POST",
      headers: { Authorization: token },
    };

    const result = await fetch(url, options)
      .then((response) => response.json()) //result will have meeting id
      .catch((error) => {
        console.error("error", error);
        alert("Invalid Meeting Id");
        window.location.href = "/";
        return;
      });
    if (result.meetingId === meetingId) {
      document.getElementById("joinPage").style.display = "flex";
      document.getElementById("home-page").style.display = "none";
      return meetingId;
    }
  } else {
    validateMeetingIdAnswer = await fetch(
      AUTH_URL + "/validatemeeting/" + meetingId,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    )
      .then(async (result) => {
        const { meetingId } = await result.json();
        console.log(meetingId);
        if (meetingId == undefined) {
          return alert("Invalid Meeting ID ");
        } else {
          document.getElementById("joinPage").style.display = "flex";
          document.getElementById("home-page").style.display = "none";
          return meetingId;
        }
      })
      .catch(async (e) => {
        alert("Meeting ID Invalid", await e);
        window.location.href = "/";
        return;
      });

    console.log("Meeting ID Answer : ", validateMeetingIdAnswer);
  }
}

function addParticipantToList({ id, displayName }) {
  let participantTemplate = document.createElement("div");
  participantTemplate.className = "row";
  participantTemplate.style.padding = "4px";
  participantTemplate.style.marginTop = "1px";
  participantTemplate.style.marginLeft = "7px";
  participantTemplate.style.marginRight = "7px";
  participantTemplate.style.borderRadius = "3px";
  participantTemplate.style.border = "1px solid rgb(61, 60, 78)";
  participantTemplate.style.backgroundColor = "rgb(61, 60, 78)";

  //icon
  let colIcon = document.createElement("div");
  colIcon.className = "col-2";
  colIcon.innerHTML = "Icon";
  participantTemplate.appendChild(colIcon);

  //name
  let content = document.createElement("div");
  colIcon.className = "col-3";
  colIcon.innerHTML = `${displayName}`;
  participantTemplate.appendChild(content);
  // participants.push({ id, displayName });

  console.log(participants);

  participantsList.appendChild(participantTemplate);
  participantsList.appendChild(document.createElement("br"));
}

function createLocalParticipant() {
  totalParticipants++;
  localParticipant = createVideoElement(meeting.localParticipant.id);
  localParticipantAudio = createAudioElement(meeting.localParticipant.id);
  // console.log("localPartcipant.id : ", localParticipant.className);
  // console.log("meeting.localPartcipant.id : ", meeting.localParticipant.id);
  videoContainer.appendChild(localParticipant);
}

function startMeeting(token, meetingId, name) {
  // Meeting config

  window.ZujoSDK.config(token);

  // Meeting Init
  meeting = window.ZujoSDK.initMeeting({
    meetingId: meetingId, // required
    name: name, // required
    micEnabled: true, // optional, default: true
    webcamEnabled: true, // optional, default: true
    maxResolution: "hd", // optional, default: "hd"
  });

  toggleControls();
  participants = meeting.participants;
  console.log("meeting obj : ", meeting);
  // Meeting Join
  meeting.join();

  //create Local Participant
  createLocalParticipant();

  //add yourself in participant list
  if (totalParticipants != 0)
    addParticipantToList({
      id: meeting.localParticipant.id,
      displayName: "You",
    });

  // Setting local participant stream
  meeting.localParticipant.on("stream-enabled", (stream) => {
    setTrack(
      stream,
      localParticipant,
      localParticipantAudio,
      meeting.localParticipant.id
    );
  });

  // Other participants
  meeting.on("participant-joined", (participant) => {
    totalParticipants++;
    let videoElement = createVideoElement(participant.id);
    let audioElement = createAudioElement(participant.id);
    remoteParticipantId = participant.id;

    participant.on("stream-enabled", (stream) => {
      setTrack(stream, videoElement, audioElement, participant.id);
    });
    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(audioElement);
    addParticipantToList(participant);
  });

  // participants left
  meeting.on("participant-left", (participant) => {
    totalParticipants--;
    let vElement = document.getElementById(`v-${participant.id}`);
    vElement.parentNode.removeChild(vElement);
    // participants = participants.filter(function (value, index, arr) {
    //   return value == participant.id;
    // });
    // console.log(participants);

    let aElement = document.getElementById(`a-${participant.id}`);
    aElement.parentNode.removeChild(aElement);
    //remove it from participant list participantId;
    document.getElementById(`p-${participant.id}`).remove();
  });
  //chat message event
  meeting.on("chat-message", (chatEvent) => {
    const { senderId, text, timestamp, senderName } = chatEvent;
    const parsedText = JSON.parse(text);
    // if (
    //   parsedText?.type == "raiseHand" &&
    //   senderId != meeting.localParticipant.id //remove this for both parties
    // ) {
    //   console.log(chatEvent.senderName + " RAISED HAND");
    // }
    if (parsedText?.type == "chat") {
      const chatBox = document.getElementById("chatArea");
      const chatTemplate = `
      <div style="margin-bottom: 10px; ${
        meeting.localParticipant.id == senderId && "text-align : right"
      }">
        <span style="font-size:12px;">${senderName}</span>
        <div style="margin-top:5px">
          <span style="background:${
            meeting.localParticipant.id == senderId ? "grey" : "crimson"
          };color:white;padding:5px;border-radius:8px">${
        parsedText.message
      }<span>
        </div>
      </div>
      `;
      chatBox.insertAdjacentHTML("beforeend", chatTemplate);
    }
  });

  // //video state changed
  // meeting.on("video-state-changed", (videoEvent) => {
  //   const { status, link, currentTime } = videoEvent;

  //   switch (status) {
  //     case "started":
  //       videoPlayback.setAttribute("src", link);
  //       videoPlayback.play();
  //       break;
  //     case "stopped":
  //       console.log("stopped");
  //       videoPlayback.removeAttribute("src");
  //       videoPlayback.pause();
  //       videoPlayback.load();
  //       break;
  //     case "resumed":
  //       videoPlayback.play();
  //       break;
  //     case "paused":
  //       videoPlayback.currentTime = currentTime;
  //       videoPlayback.pause();
  //       break;

  //     case "seeked":
  //       break;

  //     default:
  //       break;
  //   }
  // });

  //recording events
  meeting.on("recording-started", () => {
    console.log("RECORDING STARTED EVENT");
    btnStartRecording.style.display = "none";
    btnStopRecording.style.display = "inline-block";
  });
  meeting.on("recording-stopped", () => {
    console.log("RECORDING STOPPED EVENT");
    btnStartRecording.style.display = "inline-block";
    btnStopRecording.style.display = "none";
  });

  meeting.on("presenter-changed", (presenterId) => {
    // if (presenterId == null) {
    //   videoScreenShare.style.visibility = "hidden";
    //   videoScreenShare.style.display = "none";
    //   console.log("presneter ID :", presenterId);
    //   console.log(
    //     "display of videoScreenShare",
    //     videoScreenShare.style.display
    //   );
    //   screenShare.removeAttribute("src");
    //   screenShare.pause();
    //   screenShare.load();
    //   meeting.disableScreenShare();
    // } else {
    //   console.log("presenter not null");
    //   videoScreenShare.style.display = "inline-block";
    // }
    if (presenterId) {
      console.log(presenterId);
      videoScreenShare.style.display = "inline-block";
    } else {
      console.log(presenterId);
      videoScreenShare.removeAttribute("src");
      videoScreenShare.pause();
      videoScreenShare.load();
      videoScreenShare.style.display = "none";

      btnScreenShare.style.color = "white";
      screenShareOn = false;
      console.log(`screen share on : ${screenShareOn}`);
    }
  });

  // meeting.on("meeting-left", () => {
  //   window.location.reload();
  // });

  // //Entry Response
  // meeting.on("entry-requested", (requestEvent) => {
  //   console.log(requestEvent, "EVENT::entryRequested");
  // });

  // meeting.on("entry-responded", (respondEvent) => {
  //   console.log(respondEvent, "EVENT::entryResponded");
  // });
  //add DOM Events
  addDomEvents();
}

// joinMeeting();
async function joinMeeting(newMeeting) {
  tokenGeneration();
  let joinMeetingName =
    document.getElementById("joinMeetingName").value || "JSSDK";
  let meetingId = document.getElementById("joinMeetingId").value || "";
  if (!meetingId && !newMeeting) {
    return alert("Please Provide a meetingId");
  }

  if (newMeeting) {
    createMeetingFlag = 1;
    joinMeetingFlag = 0;
  } else if (meetingId != "") {
    joinMeetingFlag = 1;
    createMeetingFlag = 0;
  } else if (!newMeeting) {
    document.getElementById("joinPage").style.display = "none";
    document.getElementById("home-page").style.display = "none";
    document.getElementById("gridPpage").style.display = "flex";
    toggleControls();
  }

  if (createMeetingFlag == 1) {
    document.getElementById("joinPage").style.display = "none";
    document.getElementById("home-page").style.display = "none";
    document.getElementById("gridPpage").style.display = "flex";
    toggleControls();
  } else if (joinMeetingFlag == 1) {
    document.getElementById("joinPage").style.display = "flex";
    document.getElementById("home-page").style.display = "none";
    document.getElementById("gridPpage").style.display = "none";
  }

  //create New Token
  // tokenGeneration();

  const options = {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  };

  if (!newMeeting) {
    console.log(meetingId);
    document.getElementById("joinPage").style.display = "none";
    document.getElementById("home-page").style.display = "none";
    document.getElementById("gridPpage").style.display = "flex";
    document.getElementById("meetingid").value = meetingId;
    startMeeting(token, meetingId, joinMeetingName);
  }

  //create New Meeting
  //get new meeting if new meeting requested;
  if (newMeeting && TOKEN != "") {
    const url = `${API_BASE_URL}/api/meetings`;
    const options = {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
    };

    const { meetingId } = await fetch(url, options)
      .then((response) => response.json())
      .catch((error) => alert("error", error));
    document.getElementById("meetingid").value = meetingId;
    startMeeting(token, meetingId, joinMeetingName);
  } else if (newMeeting && TOKEN == "") {
    meetingId = await fetch(AUTH_URL + "/createMeeting", options).then(
      async (result) => {
        console.log("result of create meeting : ", result);
        const { meetingId } = await result.json();
        console.log("NEW MEETING meetingId", meetingId);
        return meetingId;
      }
    );
    document.getElementById("meetingid").value = meetingId;
    startMeeting(token, meetingId, joinMeetingName);
  }

  //set meetingId
}

// creating video element
function createVideoElement(pId) {
  let division;
  division = document.createElement("div");
  division.setAttribute("id", "video-frame-container");
  division.className = `v-${pId}`;
  let videoElement = document.createElement("video");
  videoElement.classList.add("video-frame");
  videoElement.setAttribute("id", `v-${pId}`);
  division.appendChild(videoElement);
  return division;
  // let videoElement = document.createElement("video");
  // videoElement.classList.add("video-frame");
  // videoElement.setAttribute("id", `v-${pId}`);
  // return videoElement;
}

// creating audio element
function createAudioElement(pId) {
  let audioElement = document.createElement("audio");
  audioElement.setAttribute("autoPlay", "false");
  audioElement.setAttribute("playsInline", "true");
  audioElement.setAttribute("controls", "false");
  audioElement.setAttribute("id", `a-${pId}`);
  return audioElement;
}

//setting up tracks
function setTrack(stream, videoElem, audioElement, id) {
  if (stream.kind == "video") {
    console.log("video evenet");
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
    let videoElm = document.getElementById(`v-${id}`);
    videoElm.srcObject = mediaStream;
    videoElm
      .play()
      .catch((error) =>
        console.error("videoElem.current.play() failed", error)
      );
  }
  if (stream.kind == "audio") {
    if (id == meeting.localParticipant.id) return;
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
    audioElement.srcObject = mediaStream;
    audioElement
      .play()
      .catch((error) => console.error("audioElem.play() failed", error));
  }
  if (stream.kind == "share") {
    screenShareOn = true;
    console.log("SHARE EVENT ");
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
    videoScreenShare.srcObject = mediaStream;
    videoScreenShare
      .play()
      .catch((error) =>
        console.error("videoElem.current.play() failed", error)
      );
    videoScreenShare.style.display = "inline-block";
    btnScreenShare.style.color = "grey";
  }
}

//add button events once meeting is created
function addDomEvents() {
  // mic button event listener
  micOn.addEventListener("click", () => {
    console.log("Mic-on pressed");
    meeting.unmuteMic();
    micOn.style.display = "none";
    micOff.style.display = "inline-block";
  });

  micOff.addEventListener("click", () => {
    console.log("Mic-f pressed");
    meeting.muteMic();
    micOff.style.display = "none";
    micOn.style.display = "inline-block";
  });

  videoCamOn.addEventListener("click", async () => {
    videoCamOn.style.display = "none";
    videoCamOff.style.display = "inline-block";
    meeting.disableWebcam();
    // joinPageWebcam.style.backgroundColor = "black";
    // joinPageWebcam.srcObject = null;
    // const options = {
    //   audio: false,
    //   video: true,
    // };
    // if (totalParticipants == 1) {
    //   const stream = await navigator.mediaDevices.getUserMedia(options);
    //   let videoElm = document.getElementById(
    //     `v-${meeting.localParticipant.id}`
    //   );
    //   videoElm.srcObject = null;
    // } else {
    //   const stream = await navigator.mediaDevices.getUserMedia(options);
    //   let videoElm = document.querySelector(`#v-${remoteParticipantId}`);
    //   videoElm.srcObject = null;
    // }
  });

  videoCamOff.addEventListener("click", async () => {
    videoCamOff.style.display = "none";
    videoCamOn.style.display = "inline-block";
    meeting.enableWebcam();
    // const options = {
    //   audio: false,
    //   video: true,
    // };
    // if (totalParticipants == 1) {
    //   const stream = await navigator.mediaDevices.getUserMedia(options);
    //   let videoElm = document.getElementById(
    //     `v-${meeting.localParticipant.id}`
    //   );

    //   videoElm.srcObject = null;
    //   videoElm.srcObject = stream;
    //   videoElm.play();
    // } else {
    //   const stream = await navigator.mediaDevices.getUserMedia(options);
    //   let videoElm = document.querySelector(`#v-${remoteParticipantId}`);
    //   videoElm.srcObject = null;
    //   videoElm.srcObject = stream;
    //   videoElm.play();
    // }
  });
  // cam button event listener
  // camButton.addEventListener("click", () => {
  //   console.log(
  //     "display style of onCam : ",
  //     document.getElementById("onCamera").style.display
  //   );
  //   if (document.getElementById("onCamera").style.display == "inline-block") {
  //     meeting.disableWebcam();
  //     document.getElementById("onCamera").style.display == "none";
  //     document.getElementById("offCamera").style.display == "inline-block";
  //   } else {
  //     meeting.enableWebcam();
  //     document.getElementById("onCamera").style.display == "inline-block";
  //     document.getElementById("offCamera").style.display == "none";
  //   }
  // });

  // screen share button event listener
  btnScreenShare.addEventListener("click", async () => {
    if (btnScreenShare.style.color == "grey") {
      // btnScreenShare.style.color = "white";
      meeting.disableScreenShare();
    } else {
      // btnScreenShare.style.color = "grey";
      meeting.enableScreenShare();
    }
  });

  //raise hand event
  $("#btnRaiseHand").click(function () {
    let participantId = localParticipant.className;
    if (participantId.split("-")[1] == meeting.localParticipant.id) {
      contentRaiseHand.innerHTML = "You Have Raised Your Hand";
    } else {
      contentRaiseHand.innerHTML = `<b>${remoteParticipantId}</b> Have Raised Their Hand`;
    }

    $("#contentRaiseHand").show();
    setTimeout(function () {
      $("#contentRaiseHand").hide();
    }, 2000);
  });

  // //send chat message button
  btnSend.addEventListener("click", async () => {
    const message = document.getElementById("txtChat").value;
    document.getElementById("txtChat").value = "";
    meeting.sendChatMessage(JSON.stringify({ type: "chat", message }));
  });

  // //leave Meeting Button
  $("#leaveCall").click(async () => {
    participants = new Map(meeting.participants);
    meeting.leave();
    window.location.reload();
    document.getElementById("home-page").style.display = "flex";
  });

  //end meeting button
  $("#endCall").click(async () => {
    meeting.end();
    window.location.reload();
  });

  // //startVideo button events [playing VIDEO.MP4]
  // startVideoBtn.addEventListener("click", async () => {
  //   meeting.startVideo({ link: "/video.mp4" });
  // });

  // //end video playback
  // stopVideoBtn.addEventListener("click", async () => {
  //   meeting.stopVideo();
  // });
  // //resume paused video
  // resumeVideoBtn.addEventListener("click", async () => {
  //   meeting.resumeVideo();
  // });
  // //pause playing video
  // pauseVideoBtn.addEventListener("click", async () => {
  //   meeting.pauseVideo({ currentTime: videoPlayback.currentTime });
  // });
  // //seek playing video
  // seekVideoBtn.addEventListener("click", async () => {
  //   meeting.seekVideo({ currentTime: 40 });
  // });
  // //startRecording
  btnStartRecording.addEventListener("click", async () => {
    console.log("btnRecording is clicked");
    meeting.startRecording();
  });
  // //Stop Recording
  btnStopRecording.addEventListener("click", async () => {
    meeting.stopRecording();
  });
}

// async function toggleMic() {
// const userMicStream = await navigator.mediaDevices.getUserMedia({
//   audio: true,
// });
// const micTrack = userMicStream
//   .getTracks()
//   .find((track) => track.kind === "audio");

//   // micTrack.onmute = (event) => {
//   //   micTrack.enabled = false;
//   //   document.getElementById("muteMic").style.display = "block";
//   //   document.getElementById("unmuteMic").style.display = "none";
//   // };

//   // micTrack.onunmute = (event) => {
//   //   document.getElementById("timeline-widget").style.backgroundColor = "#fff";
//   // };

//   // if (micTrack.enabled) {
//   //   micTrack.enabled = false;
//   //   document.getElementById("muteMic").style.display = "block";
//   //   document.getElementById("unmuteMic").style.display = "none";
//   // } else {
//   //   micTrack.enabled = true;
//   //   document.getElementById("muteMic").style.display = "block";
//   //   document.getElementById("unmuteMic").style.display = "none";
//   // }
//   console.log("mictrack enabled : ", micTrack.enabled);
//   // if (micEnable) {
//   //   micEnable = false;
//   //   micEnable.enabled = false;
//   //   document.getElementById("muteMic").style.display = "block";
//   //   document.getElementById("unmuteMic").style.display = "none";
//   // } else {
//   //   micEnable = true;
//   //   micTrack.enabled = true;
//   //   document.getElementById("muteMic").style.display = "none";
//   //   document.getElementById("unmuteMic").style.display = "block";
//   // }
//   // if (micTrack.muted) {
//   //   // micTrack.enabled = false;
//   //   micTrack.muted = false;
//   //   document.getElementById("muteMic").style.display = "block";
//   //   document.getElementById("unmuteMic").style.display = "none";
//   // } else {
//   //   // micTrack.enabled = true;
//   //   micTrack.muted = true;
//   //   document.getElementById("muteMic").style.display = "none";
//   //   document.getElementById("unmuteMic").style.display = "block";
//   // }

//   //   micEnable = false;
//   // } else {
//   //   const userMicStream = await navigator.mediaDevices.getUserMedia({
//   //     audio: true,
//   //   });
//   //   const micTrack = userMicStream
//   //     .getTracks()
//   //     .find((track) => track.kind === "audio");
//   //   console.log(micTrack);
//   //   document.getElementById("muteMic").style.display = "none";
//   //   document.getElementById("unmuteMic").style.display = "block";
//   //   micEnable = true;
//   // }
// }

// async function toggleWebCam() {
//   const userVideoStream = await navigator.mediaDevices
//     .getUserMedia({
//       video: true,
//     })
//     .then((videoStream) => {
//       joinPageWebcam.srcObject = videoStream;
//       joinPageWebcam.play();
//     });
//   // const videoTrack = userVideoStream
//   //   .getTracks()
//   //   .find((track) => track.kind === "video");
//   // console.log(userVideoStream.getTracks());

//   // if (videoTrack.enabled) {
//   //   videoTrack.enabled =  false;
//   // } else {
//   //   videoTrack.enabled = true;
//   // }

//   // alert("toggle web cam");
//   // if (webCamEnable) {
//   //   // meeting.muteW
//   //   document.getElementById("mutemic").style.display = "block";
//   //   document.getElementById("unmutemic").style.display = "none";
//   //   webCamEnable = false;
//   // } else {
//   //   // meeting.unmuteMic();
//   //   document.getElementById("mutemic").style.display = "none";
//   //   document.getElementById("unmutemic").style.display = "block";
//   //   webCamEnable = true;
//   // }
// }

async function toggleMic() {
  const userMicStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
  // console.log("mic enabled : ", userMicStream.getAudioTracks()[0].enabled);
  if (micEnable) {
    userMicStream.getAudioTracks()[0].stop();
    document.getElementById("micButton").style.backgroundColor = "red";
    document.getElementById("muteMic").style.display = "inline-block";
    document.getElementById("unmuteMic").style.display = "none";
    micEnable = false;
  } else {
    userMicStream.getAudioTracks()[0].enabled = true;
    micEnable = true;
    document.getElementById("micButton").style.backgroundColor = "#DCDCDC";
    document.getElementById("muteMic").style.display = "none";
    document.getElementById("unmuteMic").style.display = "inline-block";
  }
}
async function toggleWebCam() {
  if (webCamEnable) {
    joinPageWebcam.style.backgroundColor = "black";
    joinPageWebcam.srcObject = null;
    document.getElementById("camButton").style.backgroundColor = "red";
    document.getElementById("offCamera").style.display = "inline-block";
    document.getElementById("onCamera").style.display = "none";
    webCamEnable = false;
  } else {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: false,
      })
      .then((stream) => {
        // console.log(stream);
        joinPageWebcam.srcObject = stream;
        joinPageWebcam.play();
      });
    document.getElementById("camButton").style.backgroundColor = "#DCDCDC";
    document.getElementById("offCamera").style.display = "none";
    document.getElementById("onCamera").style.display = "inline-block";
    webCamEnable = true;
  }
}

function copyMeetingCode() {
  copy_meeting_id.select();
  document.execCommand("copy");
}

//open participant wrapper
function openParticipantWrapper() {
  document.getElementById("participants").style.width = "350px";
  document.getElementById("gridPpage").style.marginRight = "350px";
  document.getElementById("ParticipantsCloseBtn").style.visibility = "visible";
  document.getElementById("totalParticipants").style.visibility = "visible";
  document.getElementById(
    "totalParticipants"
  ).innerHTML = `Participants (${totalParticipants})`;
}

function closeParticipantWrapper() {
  document.getElementById("participants").style.width = "0";
  document.getElementById("gridPpage").style.marginRight = "0";
  document.getElementById("ParticipantsCloseBtn").style.visibility = "hidden";
  document.getElementById("totalParticipants").style.visibility = "hidden";
}

function openChatWrapper() {
  document.getElementById("chatModule").style.width = "350px";
  document.getElementById("gridPpage").style.marginRight = "350px";
  document.getElementById("chatCloseBtn").style.visibility = "visible";
  document.getElementById("chatHeading").style.visibility = "visible";
  document.getElementById("btnSend").style.display = "inline-block";
}

function closeChatWrapper() {
  document.getElementById("chatModule").style.width = "0";
  document.getElementById("gridPpage").style.marginRight = "0";
  document.getElementById("chatCloseBtn").style.visibility = "hidden";
  document.getElementById("btnSend").style.display = "none";
}

function toggleControls() {
  console.log("from toggleControls");
  if (micEnable) {
    console.log("micEnable True");
    micOn.style.display = "inline-block";
    micOff.style.display = "none";
  } else {
    console.log("micEnable False");
    micOn.style.display = "none";
    micOff.style.display = "inline-block";
  }

  if (webCamEnable) {
    console.log("webCamEnable True");
    videoCamOn.style.display = "inline-block";
    videoCamOff.style.display = "none";
  } else {
    console.log("webCamEnable False");
    videoCamOn.style.display = "none";
    videoCamOff.style.display = "inline-block";
  }
}
