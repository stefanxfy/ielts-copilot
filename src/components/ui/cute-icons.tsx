/**
 * 可爱风矢量图标（Task #46）
 * 来源 Iconify 线上 API 的 MingCute 图标集（https://icon-sets.iconify.design/mingcute/）
 * Apache-2.0 许可；内联 SVG 零依赖、currentColor 跟随文字色、stroke 2.5 加粗显圆润
 * 替换原则：高频可见位（导航/按钮/空态/toast）用这里；长尾兜底仍可用 lucide-react
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ================= 导航 ================= */

export function DashboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M4 12.6a8 8 0 1 1 16 0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M12.95 13.05a1.35 1.35 0 1 1-1.9 0l3.95-3.1-2.05 3.1Z"
        fill="currentColor"
      />
      <path
        d="M4 19h16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15.5"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="8.5" cy="12.5" r="1.4" fill="currentColor" />
      <circle cx="15.5" cy="12.5" r="1.4" fill="currentColor" />
      <path
        d="M8.5 16.5h7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect
        x="3"
        y="4.5"
        width="18"
        height="12.5"
        rx="3"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M9.5 20.5h5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M12 17v3.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="m10 8.6 4 2.15-4 2.15V8.6Z"
        fill="currentColor"
      />
    </Svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 6.8c-1.3-1.6-3.4-2.3-6.2-2.3-.9 0-1.8.07-2.55.2v12.9c.75-.13 1.65-.2 2.55-.2 2.8 0 4.9.7 6.2 2.3 1.3-1.6 3.4-2.3 6.2-2.3.9 0 1.8.07 2.55.2V4.7c-.75-.13-1.65-.2-2.55-.2-2.8 0-4.9.7-6.2 2.3Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M12 6.8V19.7" stroke="currentColor" strokeWidth="2.5" />
    </Svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 3.6c.9 0 1.75.12 2.55.34l.55 2.06c.62.25 1.2.58 1.72.98l2-.62a8.5 8.5 0 0 1 2.06 3.55l-1.46 1.44c.05.34.08.7.08 1.05s-.03.71-.08 1.05l1.46 1.44a8.5 8.5 0 0 1-2.06 3.55l-2-.62c-.53.4-1.1.73-1.72.98l-.55 2.06A8.6 8.6 0 0 1 12 20.9c-.9 0-1.75-.12-2.55-.34l-.55-2.06a6.6 6.6 0 0 1-1.72-.98l-2 .62a8.5 8.5 0 0 1-2.06-3.55l1.46-1.44a6.7 6.7 0 0 1 0-2.1L3.12 9.6a8.5 8.5 0 0 1 2.06-3.55l2 .62c.53-.4 1.1-.73 1.72-.98l.55-2.06c.8-.22 1.65-.34 2.55-.34Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12.25"
        r="3"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </Svg>
  );
}

/* ================= 主题切换 ================= */

export function SunIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle
        cx="12"
        cy="12"
        r="4.2"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5 6.9 6.9M17.1 17.1l1.4 1.4M18.5 5.5 17.1 6.9M6.9 17.1 5.5 18.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M20.2 14.2A8.5 8.5 0 0 1 9.8 3.8a8.5 8.5 0 1 0 10.4 10.4Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 5.2c.25.9.95 1.6 1.85 1.85-.9.25-1.6.95-1.85 1.85-.25-.9-.95-1.6-1.85-1.85.9-.25 1.6-.95 1.85-1.85Z"
        fill="currentColor"
      />
    </Svg>
  );
}

/* ================= Toast（sonner 图标替换） ================= */

export function CircleCheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="m8.5 12.2 2.4 2.4 4.6-4.9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <circle cx="12" cy="8.4" r="1.4" fill="currentColor" />
      <path
        d="M12 11.4v5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TriangleAlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M10.6 4.1a1.6 1.6 0 0 1 2.8 0l7 12.6a1.6 1.6 0 0 1-1.4 2.4H5a1.6 1.6 0 0 1-1.4-2.4l7-12.6Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.6" r="1.4" fill="currentColor" />
      <path
        d="M12 12.8v3.2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function OctagonXIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M8.2 3.5h7.6c.5 0 1 .2 1.35.55l3.3 3.3c.35.35.55.84.55 1.35v7.6c0 .5-.2 1-.55 1.35l-3.3 3.3c-.35.35-.84.55-1.35.55H8.2c-.5 0-1-.2-1.35-.55l-3.3-3.3a1.9 1.9 0 0 1-.55-1.35V8.7c0-.5.2-1 .55-1.35l3.3-3.3c.35-.35.84-.55 1.35-.55Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="m9.5 9.5 5 5M14.5 9.5l-5 5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LoaderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ================= 常用通用 ================= */

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="m6.5 9.5 5.5 5 5.5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="m6.5 14.5 5.5-5 5.5 5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="m6.5 6.5 11 11M17.5 6.5l-11 11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="m5.5 12.5 4.2 4.2 8.8-9.4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M14.2 5.6 18.4 9.8 8.9 19.3l-4.5.8.8-4.5 9-10Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="m12.7 7.1 4.2 4.2"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M4.5 6.5h15"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M9.5 3.8h5c.6 0 1 .4 1 1v1.7h-7V4.8c0-.6.4-1 1-1Z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M6.2 6.5h11.6l-.8 11.4a2.3 2.3 0 0 1-2.3 2.1H9.3a2.3 2.3 0 0 1-2.3-2.1L6.2 6.5Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M10.3 10.5v5.5M13.7 10.5v5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 5.5v13M5.5 12h13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M9 4.5c.4 2.7 1.8 4.1 4.5 4.5-2.7.4-4.1 1.8-4.5 4.5-.4-2.7-1.8-4.1-4.5-4.5 2.7-.4 4.1-1.8 4.5-4.5Z"
        fill="currentColor"
      />
      <path
        d="M16 12.5c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3Z"
        fill="currentColor"
      />
    </Svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M8 4.5h8v5a4 4 0 0 1-8 0v-5Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 5.5H5a3 3 0 0 0 3 4.3M16 5.5h3a3 3 0 0 1-3 4.3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M12 13.5v3M8.5 20.5h7M10 20.5l.5-4h3l.5 4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChartLineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M4 4.5v13.5a1.5 1.5 0 0 0 1.5 1.5H20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="m7.5 13 3-3 2.8 2.2 4.7-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </Svg>
  );
}
