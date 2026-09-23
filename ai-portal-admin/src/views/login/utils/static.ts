import { defineComponent, h, markRaw } from "vue";

/** 登录页背景（wave 底图） */
export const bg: string = new URL(
  "../../../assets/login/bg.svg",
  import.meta.url
).href;

/** 登录页插画（简化版内联 SVG 组件） */
export const illustration = markRaw(
  defineComponent({
    name: "LoginIllustration",
    render() {
      return h(
        "svg",
        {
          viewBox: "0 0 480 360",
          width: "420",
          xmlns: "http://www.w3.org/2000/svg",
          role: "img",
          "aria-label": "illustration"
        },
        [
          h("rect", {
            x: "40",
            y: "60",
            width: "400",
            height: "250",
            rx: "18",
            fill: "#eef3fb"
          }),
          h("rect", {
            x: "70",
            y: "100",
            width: "180",
            height: "16",
            rx: "8",
            fill: "#409EFF",
            opacity: "0.85"
          }),
          h("rect", {
            x: "70",
            y: "140",
            width: "240",
            height: "12",
            rx: "6",
            fill: "#c3d4ef"
          }),
          h("rect", {
            x: "70",
            y: "168",
            width: "200",
            height: "12",
            rx: "6",
            fill: "#c3d4ef"
          }),
          h("rect", {
            x: "70",
            y: "210",
            width: "150",
            height: "60",
            rx: "10",
            fill: "#dcebff"
          }),
          h("circle", {
            cx: "360",
            cy: "150",
            r: "48",
            fill: "#409EFF",
            opacity: "0.16"
          }),
          h("circle", {
            cx: "360",
            cy: "150",
            r: "28",
            fill: "#409EFF",
            opacity: "0.35"
          }),
          h("path", {
            d: "M344 150l12 12 22-24",
            stroke: "#409EFF",
            "stroke-width": "6",
            fill: "none",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
          }),
          h("rect", {
            x: "70",
            y: "290",
            width: "330",
            height: "10",
            rx: "5",
            fill: "#e2e8f4"
          })
        ]
      );
    }
  })
);
