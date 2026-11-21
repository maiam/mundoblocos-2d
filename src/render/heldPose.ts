/**
 * Pose da mão em primeira pessoa (ADR 0071, 0074): procedural, no modelo do Minecraft (`ItemInHandRenderer`): nenhum keyframe, só um contador normalizado de golpe `p` (0 → 1 em `SWING_S` = 6 ticks)
 * e três curvas de seno. Puro (sem THREE nem DOM); espaço de câmera (−Z à frente, +Y acima, +X à direita).
 */
export const SWING_S = 0.3;
/** Quanto a mão afunda depois de um golpe isolado e enquanto se repete o golpe (recupera a ~1,1 por segundo; 1 = 0,3 m). */
export const DIP_SINGLE = 0.45, DIP_LOOP = 0.15;

export interface HandPose { x: number; y: number; z: number; rx: number; ry: number; rz: number }

/** Estilo de golpe do item na mão: a adaga corta em diagonal; a picareta desce por cima (ADR 0078). */
export type HandKind = 'dagger' | 'pick' | 'hand' | 'block' | 'flat' | 'tool';
/** Repouso da adaga: pende à direita e embaixo, ponta para frente e para cima (a ponta do modelo é +Y). */
export const REST: HandPose = { x: 0.26, y: -0.12, z: -0.52, rx: -0.8, ry: 0, rz: 0.3 };
/** Repouso e amplitudes do golpe de cada estilo (o da adaga é o histórico; a picareta segura o cabo na vertical com a cabeça para cima e à frente). */
export const STYLES: Record<HandKind, { rest: HandPose; dx: number; dy: number; dz: number; drx: number; dry: number; drz: number }> = {
  dagger: { rest: REST, dx: 0.3, dy: 0.1, dz: 0.18, drx: 48, dry: 42, drz: 48 },
  pick: { rest: { x: 0.3, y: -0.22, z: -0.55, rx: -0.45, ry: -0.25, rz: 0.22 }, dx: 0.14, dy: 0.12, dz: 0.22, drx: 78, dry: 14, drz: 10 },
  // ADR 0087 (categorias do Minecraft): braço, cubo, sprite plano e sprite de ferramenta (pivô no cabo) usam as mesmas curvas de golpe com repouso e amplitudes próprios
  hand: { rest: { x: 0.46, y: -0.52, z: -0.5, rx: -0.95, ry: 0.55, rz: -0.4 }, dx: 0.12, dy: 0.1, dz: 0.2, drx: 40, dry: 20, drz: 14 },
  block: { rest: { x: 0.3, y: -0.1, z: -0.62, rx: 0.1, ry: 0.785, rz: 0 }, dx: 0.14, dy: 0.1, dz: 0.18, drx: 36, dry: 16, drz: 12 },
  flat: { rest: { x: 0.26, y: -0.08, z: -0.55, rx: 0.12, ry: -0.5, rz: 0.12 }, dx: 0.14, dy: 0.1, dz: 0.18, drx: 36, dry: 18, drz: 16 },
  tool: { rest: { x: 0.3, y: -0.2, z: -0.55, rx: -0.3, ry: -0.5, rz: 0.4 }, dx: 0.14, dy: 0.12, dz: 0.2, drx: 70, dry: 14, drz: 10 },
};
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
export function handPose(p: number, bob: { x: number; y: number } = { x: 0, y: 0 }, dip = 0, kind: HandKind = 'dagger'): HandPose {
  const { sin1, sin2, sinSq } = swingCurves(p), st = STYLES[kind], r = st.rest;
  return {
    x: r.x - sin2 * st.dx + bob.x,
    y: r.y + sin1 * st.dy - dip * 0.3 + bob.y,
    z: r.z - sin2 * st.dz,
    rx: r.rx - sin2 * st.drx * DEG,
    ry: r.ry + sin2 * st.dry * DEG - sinSq * 20 * DEG,
    rz: r.rz + sin2 * st.drz * DEG,
  };
}

/** Troca de item (ADR 0087): o item antigo afunda (`EQUIP_DEPTH` m em `EQUIP_DOWN_S`), a troca acontece lá embaixo e o novo sobe (`EQUIP_UP_S`). Puro. */
export const EQUIP_DOWN_S = 0.12, EQUIP_UP_S = 0.15, EQUIP_DEPTH = 0.6;
export class EquipAnim {
  /** Segundos desde o começo da troca (−1 = parada). */
  t = -1;
  get active(): boolean { return this.t >= 0; }
  /** Começa a troca; se já estiver subindo, volta a afundar a partir da profundidade em que está (sem salto). */
  start(): void {
    if (this.t >= EQUIP_DOWN_S) { const u = (this.t - EQUIP_DOWN_S) / EQUIP_UP_S; this.t = EQUIP_DOWN_S * (1 - u); } else if (this.t < 0) this.t = 0;
  }
  /** Avança `dt` s e devolve o deslocamento vertical (≤ 0, em metros) e se o item novo já deve aparecer (do fundo em diante). */
  update(dt: number): { offset: number; swapped: boolean } {
    if (this.t < 0) return { offset: 0, swapped: true };
    this.t += dt;
    if (this.t < EQUIP_DOWN_S) return { offset: -EQUIP_DEPTH * (this.t / EQUIP_DOWN_S), swapped: false };
    if (this.t < EQUIP_DOWN_S + EQUIP_UP_S) return { offset: -EQUIP_DEPTH * (1 - (this.t - EQUIP_DOWN_S) / EQUIP_UP_S), swapped: true };
    this.t = -1;
    return { offset: 0, swapped: true };
  }
}

/** Estado da animação da mão: golpe (um disparo ou repetido enquanto se age), afundamento e balanço. `update` devolve a pose do quadro. */
export class HandAnim {
  /** Segundos desde o início do golpe em curso (−1 = parada). */
  swingElapsed = -1;
  equipOffset = 0;
  /** Estilo do item na mão (muda ao trocar o item). */
  kind: HandKind = 'dagger';
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
    return handPose(this.swingElapsed >= 0 ? this.swingElapsed / SWING_S : 0, bobOffset(this.bobTimer, speed, grounded), this.equipOffset, this.kind);
  }
}
