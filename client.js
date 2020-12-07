'use strict';

let blobUrl = null;

function displayImg(j) {
  if (blobUrl !== null) URL.revokeObjectURL(blobUrl);
  blobUrl = URL.createObjectURL(new Blob([j.blob]));
  I('cameraImg').src = blobUrl;
}

let quality = 0.5;
let frameGapTime = 1000;

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const meetingId = urlParams.get("meetingId");
  quality = parseFloat(urlParams.get("quality")) || 0.5;
  frameGapTime = urlParams.get("frameGapTime") || 1000;

  const peer = new Peer(null, { debug: 2 });

  peer.on('open', (id) => {
    console.log("PeerJS server gave us ID " + id);

    const conn = peer.connect(meetingId, {
      reliable: true,
      serialization: 'binary'
    });

    let requestSentTime = 0;

    function request() {
      conn.send({ action: "GetImg", quality: quality });
      requestSentTime = Date.now();
    }

    conn.on('open', () => {
      console.log("Connected to " + conn.peer);
      request();
    });

    conn.on('data', (data) => {
      const size = data.blob.byteLength / 1e6; // MB
      const dt = (Date.now() - requestSentTime) / 1e3; // s
      const rate = size / dt;
      console.log(`Image received from camera: ${data.width}x${data.height}, ${size.toFixed(3)}MB, RTT=${dt.toFixed(3)}s, ${rate.toFixed(3)}MB/s`);
      displayImg(data);
      setTimeout(request, frameGapTime);
    });

    conn.on('close', () => {
      console.log("Connection to camera closed");
    });
  });

  peer.on('disconnected', () => {
    console.log("disconnected!");
  });

  peer.on('close', () => {
    console.log('Connection to PeerJS server closed');
  });

  peer.on('error', (err) => {
    console.log(err);
  });
}
