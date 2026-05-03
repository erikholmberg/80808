"use client";

import Image from "next/image";
import { useState } from "react";
import type { VoiceId } from "@/voices";
import { VOICES } from "@/voices";
import { MACHINE_PAD_LAYOUT } from "@/machinePadLayout";
import styles from "./MachineGraphic.module.css";

type Props = {
  pressed: Partial<Record<VoiceId, boolean>>;
  onPadDown: (voice: VoiceId) => void;
  onPadUp: (voice: VoiceId) => void;
};

export function MachineGraphic({ pressed, onPadDown, onPadUp }: Props) {
  const [src, setSrc] = useState("/tr808-pixel.png");

  return (
    <div className={styles.stage}>
      <div className={styles.frame}>
        <Image
          src={src}
          alt="808-style drum machine graphic"
          width={800}
          height={400}
          className={styles.photo}
          priority
          unoptimized
          onError={() => setSrc("/machine-placeholder.svg")}
        />
        <div className={styles.overlay} aria-hidden>
          {VOICES.map((v) => {
            const box = MACHINE_PAD_LAYOUT[v];
            const isPressed = Boolean(pressed[v]);
            return (
              <button
                key={v}
                type="button"
                className={`${styles.padHit} ${isPressed ? styles.padPressed : ""}`}
                style={{
                  top: `${box.top}%`,
                  left: `${box.left}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                }}
                aria-label={`Trigger ${v}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  (e.target as HTMLButtonElement).setPointerCapture(e.pointerId);
                  onPadDown(v);
                }}
                onPointerUp={(e) => {
                  try {
                    (e.target as HTMLButtonElement).releasePointerCapture(
                      e.pointerId,
                    );
                  } catch {
                    /* already released */
                  }
                  onPadUp(v);
                }}
                onPointerCancel={(e) => {
                  try {
                    (e.target as HTMLButtonElement).releasePointerCapture(
                      e.pointerId,
                    );
                  } catch {
                    /* ignore */
                  }
                  onPadUp(v);
                }}
                onLostPointerCapture={() => onPadUp(v)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
