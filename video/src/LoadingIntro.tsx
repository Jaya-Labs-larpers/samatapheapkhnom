import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import {
  BUTTERFLY_VIEWBOX,
  LEFT_WING,
  RIGHT_WING,
  WING_DARK,
  WING_HINGE,
  WING_PALE,
  type WingPaths,
} from "../../src/lib/butterflies/shape";

loadFont({
  family: "Noto Sans",
  url: staticFile("fonts/noto-sans-latin.woff2"),
  weight: "400 700",
});

export const loadingIntroSchema = z.object({
  background: z.string(),
  flapsPerSecond: z.number().min(0.25).max(4),
  closedSpan: z.number().min(0.2).max(1),
});

type LoadingIntroProps = z.infer<typeof loadingIntroSchema>;

const Wing: React.FC<{ wing: WingPaths; span: number }> = ({ wing, span }) => (
  <g
    transform={`translate(${WING_HINGE.x} ${WING_HINGE.y}) scale(${span} 1) translate(${-WING_HINGE.x} ${-WING_HINGE.y})`}
  >
    {wing.pale.map((d) => (
      <path key={d} d={d} fill={WING_PALE} />
    ))}
    {wing.dark.map((d) => (
      <path key={d} d={d} fill={WING_DARK} />
    ))}
  </g>
);

export const LoadingIntro: React.FC<LoadingIntroProps> = ({
  background,
  flapsPerSecond,
  closedSpan,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const phase = (frame / fps) * flapsPerSecond * Math.PI * 2;
  const span = 1 - (1 - closedSpan) * (0.5 - 0.5 * Math.cos(phase));

  return (
    <AbsoluteFill
      name="Loader"
      style={{
        backgroundColor: background,
        justifyContent: "center",
        alignItems: "center",
        gap: 72,
      }}
    >
      <Interactive.Div
        name="Butterfly"
        style={{
          width: 420,
        }}
      >
        <svg
          viewBox={`0 0 ${BUTTERFLY_VIEWBOX.width} ${BUTTERFLY_VIEWBOX.height}`}
          style={{ width: "100%", display: "block", overflow: "visible" }}
        >
          <Wing wing={LEFT_WING} span={span} />
          <Wing wing={RIGHT_WING} span={span} />
        </svg>
      </Interactive.Div>
      <Interactive.Div
        name="Track"
        style={{
          width: 360,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#e7ebf7",
          overflow: "hidden",
        }}
      >
        <Interactive.Div
          name="Progress"
          style={{
            width: 360,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#26cbee",
            transformOrigin: "left center",
            scale: interpolate(frame, [0, durationInFrames - 15], ["0 1", "1 1"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.33, 0, 0.2, 1),
            }),
          }}
        />
      </Interactive.Div>
      <Interactive.Div
        name="Label"
        style={{
          fontFamily: "'Noto Sans', sans-serif",
          fontSize: 44,
          fontWeight: 500,
          lineHeight: 1.4,
          color: "#3e4869",
        }}
      >
        Loading
      </Interactive.Div>
    </AbsoluteFill>
  );
};
