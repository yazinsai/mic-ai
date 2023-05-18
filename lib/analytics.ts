import Analytics from "analytics";
import mixpanelPlugin from "@analytics/mixpanel";

const analytics = Analytics({
  app: "mic-ai",
  plugins: [
    mixpanelPlugin({
      token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
    }),
  ],
});

export default analytics;
