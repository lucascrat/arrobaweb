/**
 * Cliente WebRTC com sinalização via Supabase Realtime.
 *
 * Tabelas:
 *   arroba.calls               — uma linha por chamada (offer / answer / status)
 *   arroba.call_ice_candidates — ICE candidates por chamada (caller/callee)
 */
import { supabase } from './supabase';

export class CallsClient {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private chatId: string;
  private userUid: string;
  private callId: string | null = null;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private onTrackCb?: (stream: MediaStream) => void;
  private onConnectCb?: () => void;

  constructor(
    chatId: string,
    userUid: string,
    onTrackCb?: (stream: MediaStream) => void,
    onConnectCb?: () => void
  ) {
    this.chatId = chatId;
    this.userUid = userUid;
    this.onTrackCb = onTrackCb;
    this.onConnectCb = onConnectCb;

    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      this.onTrackCb?.(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'connected') this.onConnectCb?.();
    };
  }

  private subscribeIce(callId: string, listenRole: 'caller' | 'callee') {
    if (this.channel) supabase.removeChannel(this.channel);
    this.channel = supabase
      .channel(`call:${callId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'arroba', table: 'call_ice_candidates', filter: `call_id=eq.${callId}` },
        (payload) => {
          const row = payload.new as { role: 'caller' | 'callee'; candidate: any };
          if (row.role === listenRole && row.candidate) {
            this.pc.addIceCandidate(new RTCIceCandidate(row.candidate)).catch(console.warn);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'arroba', table: 'calls', filter: `id=eq.${callId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.answer && !this.pc.currentRemoteDescription) {
            this.pc.setRemoteDescription(new RTCSessionDescription(row.answer)).catch(console.warn);
          }
        }
      )
      .subscribe();
  }

  async startCall(localVideoElement?: HTMLVideoElement, isVideo = true) {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
    if (localVideoElement) localVideoElement.srcObject = this.localStream;
    this.localStream.getTracks().forEach((t) => this.pc.addTrack(t, this.localStream!));

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    const { data, error } = await supabase
      .from('calls')
      .insert({
        chat_id: this.chatId,
        caller_id: this.userUid,
        offer: { type: offer.type, sdp: offer.sdp },
        status: 'ringing',
      })
      .select('id')
      .single();
    if (error) throw error;

    this.callId = data!.id;
    this.subscribeIce(this.callId!, 'callee');

    this.pc.onicecandidate = async (event) => {
      if (event.candidate && this.callId) {
        await supabase.from('call_ice_candidates').insert({
          call_id: this.callId,
          role: 'caller',
          candidate: event.candidate.toJSON(),
        });
      }
    };
  }

  async answerCall(localVideoElement?: HTMLVideoElement, isVideo = true) {
    const { data: call } = await supabase
      .from('calls')
      .select('*')
      .eq('chat_id', this.chatId)
      .eq('status', 'ringing')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!call) return;

    this.callId = call.id;

    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
    if (localVideoElement) localVideoElement.srcObject = this.localStream;
    this.localStream.getTracks().forEach((t) => this.pc.addTrack(t, this.localStream!));

    await this.pc.setRemoteDescription(new RTCSessionDescription(call.offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await supabase
      .from('calls')
      .update({ answer: { type: answer.type, sdp: answer.sdp }, status: 'active', callee_id: this.userUid })
      .eq('id', this.callId);

    this.subscribeIce(this.callId!, 'caller');

    this.pc.onicecandidate = async (event) => {
      if (event.candidate && this.callId) {
        await supabase.from('call_ice_candidates').insert({
          call_id: this.callId,
          role: 'callee',
          candidate: event.candidate.toJSON(),
        });
      }
    };
  }

  async endCall() {
    this.pc.close();
    this.localStream?.getTracks().forEach((t) => t.stop());
    if (this.channel) supabase.removeChannel(this.channel);
    if (this.callId) {
      try {
        await supabase
          .from('calls')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', this.callId);
      } catch (e) {
        console.warn('endCall update failed', e);
      }
    }
  }
}
