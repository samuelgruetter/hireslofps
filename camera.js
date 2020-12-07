'use strict';

let isCameraOpen = false;

const toggle = withErrLog(() => {
  if (isCameraOpen) {
    closeCamera();
    I("openCameraButton").innerHTML = "Open Camera";
  } else {
    init();
    I("openCameraButton").innerHTML = "Close Camera";
  }
});

function openCamera(frameRate, w, h) {
  const constraints = {
    video: { facingMode: "environment", width: w, height: h, frameRate: frameRate }
  };
  navigator.mediaDevices.getUserMedia(constraints)
    .then(withErrLog(stream => {
      const s = stream.getVideoTracks()[0].getSettings();
      log(`Camera resolution is ${s.width} x ${s.height} @ ${s.frameRate}fps`);
      I('canvas').width = s.width;
      I('canvas').height = s.height;
      I('player').srcObject = stream;
      isCameraOpen = true;
    }));
}

var destroyPeerJS = null;

function closeCamera() {
  if (destroyPeerJS) destroyPeerJS();
  I('player').srcObject.getVideoTracks().forEach(track => track.stop());
  isCameraOpen = false;
}

function sendImg(conn, quality) {
  I('canvas').getContext('2d').drawImage(player, 0, 0, I('canvas').width, I('canvas').height);
  I('canvas').toBlob(withErrLog(blob => {
    const msg = {
      type: "img",
      width: I('canvas').width,
      height: I('canvas').height,
      blob: blob
    };
    conn.send(msg);
  }), 'image/jpeg', quality || 0.5);
}

function makeClientLink(meetingId) {
  return `${window.location.protocol}//${window.location.host}/${window.location.pathname.replace("camera.html", "client.html")}?meetingId=${meetingId}`;
}

function log(msg) {
  I("log").innerText += '\n' + msg;
  I("rightHalf").scrollTop = I("rightHalf").scrollHeight;
}

function withErrLog(f) {
  return function (...args) {
    try { return f(...args); }
    catch (e) { 
      log("Error:");
      log(e.toString());
      log(e.stack.toString());
      throw e;
    }
  };
}

function initPeerJs(meetingId) {
  const peer = new Peer(meetingId, { debug: 2 });
  destroyPeerJS = () => {
    peer.destroy();
  }

  peer.on('open', (id) => {
    log('Connected to PeerJS server');
    log('Share the following link with attendees:');
    log(makeClientLink(id));
  });

  var nextFreeClientId = 1; // 0 is ourselves

  peer.on('connection', (conn) => {
    const clientId = nextFreeClientId;
    nextFreeClientId++;

    log("Connected to " + conn.peer + ", clientId: " + clientId);

    conn.on('open', () => {
      log("Connection to " + conn.peer + " open");
    });

    conn.on('data', (msg) => {
      if (msg.action === 'GetImg') {
        sendImg(conn, msg.quality ? Number.parseFloat(msg.quality) : 0.5);
      }
    });

    conn.on('close', () => {
      log(`Connection to client ${clientId} closed`);
    });
  });

  peer.on('disconnected', () => {
    log("Disconnected from PeerJS server");
  });

  peer.on('close', () => {
    log('Connection to PeerJS server closed');
  });

  peer.on('error', (err) => {
    log(err);
  });
}

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const meetingId = urlParams.get("meetingId");
  const frameLengthTry = parseFloat(urlParams.get("frameLength"));
  const frameLength = Number.isFinite(frameLengthTry) && frameLengthTry > 0 ? frameLengthTry : 5.0;
  const w = parseInt(urlParams.get("w")) || 1920;
  const h = parseInt(urlParams.get("h")) || 1080;
  openCamera(1.0 / frameLength, w, h);
  initPeerJs(meetingId);
}
