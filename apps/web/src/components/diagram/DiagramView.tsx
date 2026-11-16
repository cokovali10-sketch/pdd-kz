import { useTranslation } from 'react-i18next';
import type { DiagramArm, DiagramSpec } from '../../lib/types';

const SIZE = 640;
const CENTER = SIZE / 2;
const ROAD = 176;
const HALF = ROAD / 2;
const LANE_OFFSET = 42;
const START_D = 118;
const SPAN_D = 172;

const ROTATION: Record<DiagramArm, number> = { n: 180, s: 0, e: 270, w: 90 };

function pointOnArm(arm: DiagramArm, pos: number): { x: number; y: number } {
  const d = START_D + Math.max(0, Math.min(1, pos)) * SPAN_D;
  switch (arm) {
    case 'n':
      return { x: CENTER - LANE_OFFSET, y: CENTER - d };
    case 's':
      return { x: CENTER + LANE_OFFSET, y: CENTER + d };
    case 'e':
      return { x: CENTER + d, y: CENTER - LANE_OFFSET };
    case 'w':
    default:
      return { x: CENTER - d, y: CENTER + LANE_OFFSET };
  }
}

function Car({
  x,
  y,
  rotation,
  label,
  color,
  size = 1,
}: {
  x: number;
  y: number;
  rotation: number;
  label: string;
  color: string;
  size?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${size})`}>
      <rect x={-23} y={-38} width={46} height={76} rx={14} fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth={2} />
      <rect x={-16} y={-26} width={32} height={20} rx={6} fill="rgba(255,255,255,0.55)" />
      <rect x={-16} y={4} width={32} height={18} rx={6} fill="rgba(255,255,255,0.28)" />
      <text
        x={0}
        y={30}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={16}
        fontWeight={700}
        fill="rgba(8,10,16,0.85)"
      >
        {label}
      </text>
    </g>
  );
}

function Tram({ x, y, rotation, label }: { x: number; y: number; rotation: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`}>
      <rect x={-28} y={-54} width={56} height={108} rx={16} fill="#b91c1c" stroke="rgba(0,0,0,0.35)" strokeWidth={2} />
      <rect x={-20} y={-40} width={40} height={26} rx={6} fill="rgba(255,255,255,0.6)" />
      <rect x={-20} y={-6} width={40} height={26} rx={6} fill="rgba(255,255,255,0.35)" />
      <text x={0} y={38} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">
        {label}
      </text>
    </g>
  );
}

function TurnArrow({ x, y, rotation, turn }: { x: number; y: number; rotation: number; turn: 'straight' | 'left' | 'right' }) {
  const path =
    turn === 'straight'
      ? 'M0,-26 L14,-4 L5,-4 L5,22 L-5,22 L-5,-4 L-14,-4 Z'
      : turn === 'left'
        ? 'M-2,-24 L14,-24 L14,-6 L24,-6 L2,18 L-20,-6 L-10,-6 L-10,-24 Z'
        : 'M2,-24 L-14,-24 L-14,-6 L-24,-6 L-2,18 L20,-6 L10,-6 L10,-24 Z';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`} opacity={0.85}>
      <path d={path} fill="var(--diagram-arrow)" />
    </g>
  );
}

function TrafficLight({ x, y, state }: { x: number; y: number; state: 'red' | 'green' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-11} y={-34} width={22} height={68} rx={9} fill="var(--diagram-pole)" stroke="rgba(0,0,0,0.3)" />
      <circle cx={0} cy={-20} r={6.5} fill={state === 'red' ? '#f87171' : 'rgba(255,255,255,0.14)'} />
      <circle cx={0} cy={-2} r={6.5} fill="rgba(255,255,255,0.14)" />
      <circle cx={0} cy={16} r={6.5} fill={state === 'green' ? '#34d399' : 'rgba(255,255,255,0.14)'} />
    </g>
  );
}

function Crossroads({ spec }: { spec: DiagramSpec }) {
  const arms = spec.arms ?? ['n', 'e', 's', 'w'];
  const main = new Set(spec.main ?? []);
  return (
    <>
      <rect x={0} y={0} width={SIZE} height={SIZE} fill="var(--diagram-bg)" />
      <rect x={CENTER - HALF} y={0} width={ROAD} height={SIZE} fill={main.has('n') || main.has('s') ? 'var(--diagram-road-main)' : 'var(--diagram-road)'} />
      <rect x={0} y={CENTER - HALF} width={SIZE} height={ROAD} fill={main.has('e') || main.has('w') ? 'var(--diagram-road-main)' : 'var(--diagram-road)'} />
      <rect
        x={CENTER - HALF}
        y={CENTER - HALF}
        width={ROAD}
        height={ROAD}
        fill="var(--diagram-road)"
      />

      <g stroke="var(--diagram-mark)" strokeWidth={4} strokeDasharray="26 20" opacity={0.75}>
        <line x1={CENTER} y1={0} x2={CENTER} y2={CENTER - HALF} />
        <line x1={CENTER} y1={CENTER + HALF} x2={CENTER} y2={SIZE} />
        <line x1={0} y1={CENTER} x2={CENTER - HALF} y2={CENTER} />
        <line x1={CENTER + HALF} y1={CENTER} x2={SIZE} y2={CENTER} />
      </g>

      {arms
        .filter((arm) => main.has(arm))
        .map((arm) => {
          const p = pointOnArm(arm, 0.92);
          return (
            <text
              key={`main-${arm}`}
              x={p.x}
              y={p.y}
              fontSize={15}
              fontWeight={700}
              fill="var(--diagram-arrow)"
              textAnchor="middle"
              opacity={0.9}
              transform={`rotate(${arm === 'n' || arm === 's' ? -90 : 0} ${p.x} ${p.y})`}
            >
              ●
            </text>
          );
        })}

      {spec.lights?.map((light) => {
        const p = pointOnArm(light.arm, 0.34);
        const offset = HALF + 20;
        const x = p.x + (light.arm === 'w' ? -offset : light.arm === 'e' ? offset : offset);
        const y = p.y + (light.arm === 'n' ? -offset : light.arm === 's' ? offset : 0);
        return <TrafficLight key={`tl-${light.arm}`} x={light.arm === 'e' || light.arm === 'w' ? p.x : x} y={light.arm === 'n' || light.arm === 's' ? p.y : y} state={light.state} />;
      })}

      {spec.vehicles.map((vehicle) => {
        const p = pointOnArm(vehicle.arm, vehicle.pos);
        return (
          <g key={vehicle.id}>
            <Car
              x={p.x}
              y={p.y}
              rotation={ROTATION[vehicle.arm]}
              label={vehicle.id === 'YOU' ? 'ВЫ' : vehicle.id}
              color={vehicle.kind === 'truck' ? 'var(--diagram-truck)' : vehicle.fromYard ? 'var(--diagram-car-2)' : 'var(--diagram-car)'}
              size={vehicle.kind === 'truck' ? 1.12 : 1}
            />
            {vehicle.turn ? (
              <TurnArrow
                x={pointOnArm(vehicle.arm, 0.22).x}
                y={pointOnArm(vehicle.arm, 0.22).y}
                rotation={ROTATION[vehicle.arm]}
                turn={vehicle.turn}
              />
            ) : null}
          </g>
        );
      })}

      {spec.trams?.map((tram) => {
        const p = pointOnArm(tram.arm, tram.pos);
        return <Tram key={tram.id} x={p.x} y={p.y} rotation={ROTATION[tram.arm]} label={tram.id} />;
      })}

      {spec.pedestrians?.map((ped, index) => {
        const p = pointOnArm(ped.arm, ped.pos);
        return (
          <g key={`ped-${index}`} transform={`translate(${p.x} ${p.y})`}>
            <circle cx={0} cy={-14} r={6} fill="var(--diagram-ped)" />
            <path d="M-5,-6 L5,-6 L7,10 L1,10 L0,2 L-1,10 L-7,10 Z" fill="var(--diagram-ped)" />
          </g>
        );
      })}

      {spec.yard ? (
        <g>
          <rect
            x={spec.yard.arm === 'w' ? 0 : CENTER + HALF}
            y={CENTER - 26}
            width={CENTER - HALF}
            height={52}
            fill="var(--diagram-yard)"
            stroke="var(--diagram-mark)"
            strokeDasharray="10 8"
            strokeWidth={3}
          />
        </g>
      ) : null}
    </>
  );
}

function Roundabout({ spec }: { spec: DiagramSpec }) {
  const radius = 176;
  const band = 74;
  return (
    <>
      <rect x={0} y={0} width={SIZE} height={SIZE} fill="var(--diagram-bg)" />
      <g stroke="var(--diagram-road)" strokeWidth={band} fill="none">
        <line x1={CENTER} y1={0} x2={CENTER} y2={CENTER} />
        <line x1={CENTER} y1={SIZE} x2={CENTER} y2={CENTER} />
        <line x1={0} y1={CENTER} x2={CENTER} y2={CENTER} />
        <line x1={SIZE} y1={CENTER} x2={CENTER} y2={CENTER} />
      </g>
      <circle cx={CENTER} cy={CENTER} r={radius + band / 2} fill="var(--diagram-road)" />
      <circle cx={CENTER} cy={CENTER} r={radius - band / 2} fill="var(--diagram-bg)" stroke="var(--diagram-mark)" strokeWidth={4} strokeDasharray="22 18" opacity={0.6} />

      {spec.vehicles.map((vehicle, index) => {
        if (vehicle.onCircle) {
          const angle = -60 + index * 40;
          const rad = (angle * Math.PI) / 180;
          const x = CENTER + Math.cos(rad) * radius;
          const y = CENTER + Math.sin(rad) * radius;
          return <Car key={vehicle.id} x={x} y={y} rotation={angle + 90} label={vehicle.id} color="var(--diagram-car)" />;
        }
        const p = pointOnArm(vehicle.arm, vehicle.pos);
        return (
          <Car
            key={vehicle.id}
            x={p.x}
            y={p.y}
            rotation={ROTATION[vehicle.arm]}
            label={vehicle.id === 'YOU' ? 'ВЫ' : vehicle.id}
            color="var(--diagram-car-2)"
          />
        );
      })}
    </>
  );
}

function Straight({ spec }: { spec: DiagramSpec }) {
  const lanes = spec.lanes ?? 2;
  return (
    <>
      <rect x={0} y={0} width={SIZE} height={SIZE} fill="var(--diagram-bg)" />
      <rect x={0} y={CENTER - HALF} width={SIZE} height={ROAD} fill="var(--diagram-road)" />
      <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} stroke="var(--diagram-mark)" strokeWidth={4} strokeDasharray="26 20" opacity={0.75} />

      {spec.crossings?.map((crossing, index) => (
        <g key={`cross-${index}`} opacity={0.92}>
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={i}
              x={crossing.pos * SIZE - 26}
              y={CENTER - HALF + 10 + i * 27}
              width={52}
              height={16}
              fill="var(--diagram-mark)"
              opacity={0.9}
            />
          ))}
        </g>
      ))}

      {spec.vehicles.map((vehicle) => {
        const fromLeft = vehicle.arm === 'w';
        const x = Math.max(60, Math.min(SIZE - 60, vehicle.pos * SIZE));
        const y = fromLeft ? CENTER + LANE_OFFSET : CENTER - LANE_OFFSET;
        return (
          <Car
            key={vehicle.id}
            x={x}
            y={y}
            rotation={fromLeft ? 90 : 270}
            label={vehicle.id === 'YOU' ? 'ВЫ' : vehicle.id}
            color={vehicle.fromYard ? 'var(--diagram-car-2)' : 'var(--diagram-car)'}
          />
        );
      })}

      {spec.pedestrians?.map((ped, index) => (
        <g key={`sp-${index}`} transform={`translate(${ped.pos * SIZE} ${CENTER + HALF + 18})`}>
          <circle cx={0} cy={-14} r={6} fill="var(--diagram-ped)" />
          <path d="M-5,-6 L5,-6 L7,10 L1,10 L0,2 L-1,10 L-7,10 Z" fill="var(--diagram-ped)" />
        </g>
      ))}

      {spec.bikes?.map((bike) => (
        <g key={bike.id} transform={`translate(${bike.pos * SIZE} ${CENTER + HALF - 18})`}>
          <circle cx={-9} cy={6} r={7} fill="none" stroke="var(--diagram-bike)" strokeWidth={3} />
          <circle cx={9} cy={6} r={7} fill="none" stroke="var(--diagram-bike)" strokeWidth={3} />
          <circle cx={0} cy={-10} r={4.5} fill="var(--diagram-bike)" />
          <path d="M0,-4 L0,4" stroke="var(--diagram-bike)" strokeWidth={3} />
        </g>
      ))}

      {lanes > 2 ? null : null}
    </>
  );
}

export function DiagramView({ spec, signFile }: { spec: DiagramSpec; signFile?: (code: string) => string | undefined }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  const caption = spec.caption ? spec.caption[locale] || spec.caption.ru : t('diagram.notToScale');
  return (
    <figure className="diagram" style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={caption}
        style={{ maxWidth: 460, margin: '0 auto' }}
      >
        {spec.type === 'roundabout' ? <Roundabout spec={spec} /> : null}
        {spec.type === 'cross' ? <Crossroads spec={spec} /> : null}
        {spec.type === 'straight' ? <Straight spec={spec} /> : null}

        {spec.signs?.map((sign, index) => {
          const file = signFile?.(sign.code);
          const p = pointOnArm(sign.arm, 0.3);
          const x = sign.side === 'left' ? p.x - 54 : p.x + 54;
          return (
            <g key={`sign-${index}`} transform={`translate(${x - 22} ${p.y - 22})`}>
              {file ? (
                <image href={file} width={44} height={44} />
              ) : (
                <rect width={44} height={44} rx={8} fill="#fff" stroke="#101418" strokeWidth={3} />
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="diagram__caption">{caption}</figcaption>
    </figure>
  );
}