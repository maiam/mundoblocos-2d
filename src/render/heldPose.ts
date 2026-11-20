/**
 * Pose da mão em primeira pessoa (ADR 0071, 0074): procedural, no modelo do Minecraft (`ItemInHandRenderer`): nenhum keyframe, só um contador normalizado de golpe `p` (0 → 1 em `SWING_S` = 6 ticks)
 * e três curvas de seno. Puro (sem THREE nem DOM); espaço de câmera (−Z à frente, +Y acima, +X à direita).
 */
export const SWING_S = 0.3;
/** Quanto a mão afunda depois de um golpe isolado e enquanto se repete o golpe (recupera a ~1,1 por segundo; 1 = 0,3 m). */
export const DIP_SINGLE = 0.45, DIP_LOOP = 0.15;

export interface HandPose { x: number; y: number; z: number; rx: number; ry: number; rz: number }

/** Repouso da adaga: pende à direita e embaixo, ponta para frente e para cima (a ponta do modelo é +Y). */
export const REST: HandPose = { x: 0.26, y: -0.12, z: -0.52, rx: -0.8, ry: 0, rz: 0.3 };
const DEG = Math.PI / 180;

/** As três curvas do Minecraft para o progresso `p` (0–1): `sin1` sobe e desce (pico em 0,5), `sin2` acelera o começo (ease-out), `sinSq` é o giro do pulso. Fora de 0–1 tudo vale 0. */
export function swingCurves(p: number): { sin1: number; sin2: number; sinSq: number } {
  if (p <= 0 || p >= 1) return { sin1: 0, sin2: 0, sinSq: 0 };
  return { sin1: Math.sin(p * Math.PI), sin2: Math.sin(Math.sqrt(p) * Math.PI), sinSq: Math.sin(p * p * Math.PI) };
}

/** Balanço da câmera ao andar (no chão, acima de 0,1 m/s) ou respiração parada, a partir de um contador de fase. */
export function bobOffset(timer: number, speed: number, grounded: boolean): { x: number; y: number } {
  if (grounded && speed > 0.1) return { x: Math.cos(timer) * 0.025, y: -Math.abs(Math.sin(timer)) * 0.025 };
  return { x: 0, y: Math.sin(timer) * 0.006 };
}

/** Posição e giro da mão para o progresso `p`, o balanço `bob` e o afundamento `dip` (0–1) após o golpe. */
export function handPose(p: number, bob: { x: number; y: number } = { x: 0, y: 0 }, dip = 0): HandPose {
  const { sin1, sin2, sinSq } = swingCurves(p);
  return {
    x: REST.x - sin2 * 0.3 + bob.x,
    y: REST.y + sin1 * 0.1 - dip * 0.3 + bob.y,
    z: REST.z - sin2 * 0.18,
    rx: REST.rx - sin2 * 48 * DEG,
    ry: REST.ry + sin2 * 42 * DEG - sinSq * 20 * DEG,
    rz: REST.rz + sin2 * 48 * DEG,
  };
}

/** Estado da animação da mão: golpe (um disparo ou repetido enquanto se age), afundamento e balanço. `update` devolve a pose do quadro. */
export class HandAnim {
  /** Segundos desde o início do golpe em curso (−1 = parada). */
  swingElapsed = -1;
  equipOffset = 0;
  private bobTimer = 0;

  /** Dispara um golpe (reinicia se já houver um); `dip` é o afundamento que a mão recupera depois. */
  trigger(dip = DIP_SINGLE): void { this.swingElapsed = 0; this.equipOffset = Math.max(this.equipOffset, dip); }
  get swinging(): boolean { return this.swingElapsed >= 0; }

  /** `looping` = o jogador está agindo (segurando para quebrar): ao terminar um golpe começa outro na hora, sem parar. */
  update(dt: number, speed: number, grounded: boolean, looping: boolean): HandPose {
    if (this.swingElapsed >= 0) {
      this.swingElapsed += dt;
      if (this.swingElapsed >= SWING_S) this.swingElapsed = looping ? this.swingElapsed - SWING_S : -1;
    } else if (looping) this.trigger(DIP_LOOP);
    if (this.equipOffset > 0) this.equipOffset = Math.max(0, this.equipOffset - dt * 1.1);
    this.bobTimer += dt * (grounded && speed > 0.1 ? Math.min(speed, 6) * 2.2 : 1.8);
    return handPose(this.swingElapsed >= 0 ? this.swingElapsed / SWING_S : 0, bobOffset(this.bobTimer, speed, grounded), this.equipOffset);
  }
}
