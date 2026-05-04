// Este arquivo simula a lógica de um Cloudflare Worker para o Cloudflare Calls
// No servidor real, isso rodaria no edge da Cloudflare.
// E no Frontend ele contém o cliente WebRTC.

import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';

/**
 * ==========================================
 * PARTE 1: BACKEND (WORKER / SERVER.TS)
 * ==========================================
 * No Cloudflare Worker, você recebe as credenciais de autenticação (ex: Firebase Token)
 * e, se válido, chama a API do Cloudflare Calls para criar uma sessão.
 */
export async function createCloudflareCallsSession(appId: string, appSecret: string) {
  const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/new`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${appSecret}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error('Falha ao criar sessão no Cloudflare Calls');
  }
  return await response.json();
}

/**
 * ==========================================
 * PARTE 2: SIGNALING & WEBRTC (FRONTEND)
 * ==========================================
 * Utiliza o Firestore (ou Realtime Database) para trocar ICE Candidates e SDP.
 */
export class CallsClient {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private chatId: string;
  private userUid: string;
  private onTrackCb?: (stream: MediaStream) => void;
  private onConnectCb?: () => void;

  constructor(chatId: string, userUid: string, onTrackCb?: (stream: MediaStream) => void, onConnectCb?: () => void) {
    this.chatId = chatId;
    this.userUid = userUid;
    this.onTrackCb = onTrackCb;
    this.onConnectCb = onConnectCb;
    
    // Stun servers
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });
      if (this.onTrackCb) this.onTrackCb(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'connected') {
        if (this.onConnectCb) this.onConnectCb();
      }
    };
  }

  async startCall(localVideoElement?: HTMLVideoElement, isVideo: boolean = true) {
    // 1. Get Local Media
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
    if (localVideoElement) {
      localVideoElement.srcObject = this.localStream;
    }
    
    this.localStream.getTracks().forEach(track => {
      this.pc.addTrack(track, this.localStream!);
    });

    // 2. Create Offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // 3. Signal Offer via Firebase
    const callRef = doc(collection(db, 'calls'), this.chatId);
    await setDoc(callRef, {
      offer: { type: offer.type, sdp: offer.sdp },
      callerId: this.userUid,
      isVideo: isVideo,
      createdAt: new Date()
    });

    // Listen for Answer
    onSnapshot(callRef, (snapshot) => {
      const data = snapshot.data();
      if (!this.pc.currentRemoteDescription && data?.answer) {
        const answer = new RTCSessionDescription(data.answer);
        this.pc.setRemoteDescription(answer);
      }
    });

    // Setup ICE gathering signaling...
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Enviar para Firebase (collection 'callerCandidates')
        const candidateRef = doc(collection(db, 'calls', this.chatId, 'callerCandidates'));
        setDoc(candidateRef, event.candidate.toJSON());
      }
    };
  }

  async answerCall(localVideoElement?: HTMLVideoElement, isVideo: boolean = true) {
    const callRef = doc(collection(db, 'calls'), this.chatId);
    const callSnap = await getDoc(callRef);
    if (!callSnap.exists()) return;

    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
    if (localVideoElement) {
      localVideoElement.srcObject = this.localStream;
    }
    this.localStream.getTracks().forEach(track => {
      this.pc.addTrack(track, this.localStream!);
    });

    const data = callSnap.data();
    await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Salvar answer
    updateDoc(callRef, {
      answer: { type: answer.type, sdp: answer.sdp }
    });

    // Receive ICE Candidates from caller...
    onSnapshot(collection(db, 'calls', this.chatId, 'callerCandidates'), (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.pc.addIceCandidate(candidate);
        }
      });
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateRef = doc(collection(db, 'calls', this.chatId, 'calleeCandidates'));
        setDoc(candidateRef, event.candidate.toJSON());
      }
    };
  }

  async endCall() {
    this.pc.close();
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    
    try {
      const callRef = doc(collection(db, 'calls'), this.chatId);
      await updateDoc(callRef, { endedAt: new Date() });
    } catch (e) {
      console.error(e);
    }
  }
}
