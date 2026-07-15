import type { EconomicEvent } from "../types";
import { buildMarketSignals, compareToForecast, isQualitativeEvent } from "./market-signal";

export type EventExplanation = {
  chineseName: string;
  definition: string;
  marketImpact: string;
};

type ExplanationRule = { pattern: RegExp; chineseName: string; definition: string };

const RULES: ExplanationRule[] = [
  { pattern: /core inflation rate mom|core cpi/i, chineseName: "核心消費者物價指數月率", definition: "剔除食品與能源後的 CPI 月變化，用來觀察較穩定的基礎通膨。" },
  { pattern: /inflation rate mom|consumer price index/i, chineseName: "消費者物價指數月率（CPI）", definition: "衡量消費者購買的一籃子商品與服務價格，相較上月的變化。" },
  { pattern: /core inflation rate yoy/i, chineseName: "核心消費者物價指數年率", definition: "剔除食品與能源後的 CPI 年變化，用來觀察中期通膨趨勢。" },
  { pattern: /inflation rate yoy/i, chineseName: "消費者物價指數年率（CPI）", definition: "衡量消費者物價相較去年同期的變化，是聯準會觀察通膨的重要指標。" },
  { pattern: /ppi/i, chineseName: "生產者物價指數（PPI）", definition: "衡量生產者出售商品與服務的價格變化，常被視為消費端通膨的先行訊號。" },
  { pattern: /non farm payrolls|nonfarm payrolls/i, chineseName: "非農就業人口", definition: "統計美國農業以外的就業增減，用來觀察勞動市場與經濟動能。" },
  { pattern: /unemployment rate/i, chineseName: "失業率", definition: "失業人口占勞動力的比例，反映勞動市場的鬆緊程度。" },
  { pattern: /ism manufacturing pmi/i, chineseName: "ISM 製造業採購經理人指數（PMI）", definition: "調查製造業企業對訂單、生產、就業與庫存的看法；50 以上通常代表擴張，以下代表收縮。" },
  { pattern: /ism services pmi/i, chineseName: "ISM 服務業採購經理人指數（PMI）", definition: "調查服務業企業活動、訂單、就業與價格狀況，反映服務業景氣方向。" },
  { pattern: /michigan consumer sentiment|consumer sentiment/i, chineseName: "密西根大學消費者信心指數", definition: "調查家庭對目前財務、經濟前景與消費意願的看法，反映消費動能。" },
  { pattern: /gdp growth|gross domestic product/i, chineseName: "國內生產毛額（GDP）", definition: "衡量美國經濟活動總量與成長速度，是最重要的景氣總指標之一。" },
  { pattern: /retail sales/i, chineseName: "零售銷售", definition: "衡量零售商銷售額變化，用來觀察家庭消費與內需強弱。" },
  { pattern: /building permits/i, chineseName: "建築許可", definition: "統計新住宅建築許可數量，是住宅建設活動的前瞻指標。" },
  { pattern: /housing starts/i, chineseName: "新屋開工", definition: "統計新住宅實際開工數量，反映房市與建築活動。" },
  { pattern: /crude oil inventories|petroleum status/i, chineseName: "原油庫存", definition: "衡量美國原油庫存變化；庫存增加通常代表供給較充裕或需求較弱。" },
  { pattern: /natural gas storage/i, chineseName: "天然氣庫存", definition: "衡量天然氣庫存變化，反映供需平衡與能源價格壓力。" },
  { pattern: /federal funds|interest rate decision/i, chineseName: "聯邦基金利率決策", definition: "聯準會對政策利率目標區間的決定，直接影響美元、利率與風險資產估值。" },
  { pattern: /fomc minutes/i, chineseName: "聯邦公開市場委員會會議紀要", definition: "公布 FOMC 會議討論內容與委員對經濟及利率路徑的看法。" },
  { pattern: /press conference/i, chineseName: "聯準會主席記者會", definition: "利率決策後的政策說明與問答，市場會從措辭判斷未來政策方向。" },
  { pattern: /speech|testimony|discussion/i, chineseName: "聯準會官員演說／聽證", definition: "官員對經濟與貨幣政策的公開發言或國會證詞，屬文字與語氣資訊，不是單一量化數據。" },
];

function fallback(event: EconomicEvent): Pick<EventExplanation, "chineseName" | "definition"> {
  const names: Record<string, string> = { inflation: "通膨指標", employment: "就業指標", growth: "經濟成長指標", manufacturing: "製造業景氣指標", services: "服務業景氣指標", energy: "能源指標", housing: "房市指標", consumer: "消費指標", monetary_policy: "貨幣政策事件" };
  return { chineseName: names[event.category] ?? "美國經濟事件", definition: "官方排程中的美國經濟或貨幣政策事件，詳細定義依資料來源公告為準。" };
}

export function explainEvent(event: EconomicEvent): EventExplanation {
  const rule = RULES.find((item) => item.pattern.test(event.name));
  const base = rule ?? fallback(event);
  if (isQualitativeEvent(event)) return { ...base, marketImpact: "此事件沒有可用的 Actual／Forecast 數值，不會自動標示利多或利空；請以官方文字內容與市場反應判讀。" };

  const comparison = compareToForecast(event);
  if (comparison === "unknown") return { ...base, marketImpact: "目前缺少可比較的 Forecast，僅憑 Actual 無法可靠判斷對黃金、原油或股市的利多／利空方向。" };
  if (comparison === "equal") return { ...base, marketImpact: "Actual 與 Forecast 相同，通常代表數據大致符合預期，沒有明確的數據驚喜方向。" };
  const signals = buildMarketSignals(event).map((signal) => signal.label);
  const comparisonText = comparison === "higher" ? "高於預期" : "低於預期";
  return { ...base, marketImpact: `${comparisonText}。${signals.length ? `依目前規則：${signals.join("、")}；若數據低於預期，方向通常相反。` : "但目前事件的受影響市場沒有足夠規則可做方向標示。"}` };
}
