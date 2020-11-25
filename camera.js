'use strict';

function openCamera(frameRate) {
  const constraints = {
    video: { facingMode: "environment", width: 4096, height: 4096, frameRate: frameRate }
  };
  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      const s = stream.getVideoTracks()[0].getSettings();
      I('resolutionP').innerText = `Camera resolution is ${s.width} x ${s.height} @ ${s.frameRate}fps`;
      I('canvas').width = s.width;
      I('canvas').height = s.height;
      I('player').srcObject = stream;
    });
}

var destroyPeerJS = null;

function closeCamera() {
  if (destroyPeerJS) destroyPeerJS();
  I('player').srcObject.getVideoTracks().forEach(track => track.stop());
}

function sendImg(conn) {
  I('canvas').getContext('2d').drawImage(player, 0, 0, I('canvas').width, I('canvas').height);
  I('canvas').toBlob(blob => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const msg = {
        type: "img",
        width: I('canvas').width,
        height: I('canvas').height,
        base64: reader.result
      };
      console.log(msg.base64.length);
      conn.send(msg);
    };
    reader.readAsDataURL(blob); 
  }, 'image/jpeg', 0.9);
}

function makeClientLink(meetingId) {
  return `${window.location.protocol}//${window.location.host}/client.html?meetingId=${meetingId}`;
}

function log(msg) {
  I('log').value += '\n' + msg;
}

function initPeerJs(meetingId) {
  const peer = new Peer(meetingId, { debug: 2 });
  destroyPeerJS = () => {
    peer.destroy();
  }

  peer.on('open', (id) => {
    log('Connected to PeerJS server');
    I('linkToShare').innerText = makeClientLink(id);
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
        sendImg(conn);
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
  openCamera(1.0 / frameLength);
  initPeerJs(meetingId);
}
