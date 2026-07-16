import type { EconomicEvent } from "../types";

export type EventExplanation = {
  chineseName: string;
  definition: string;
  marketImpact: string;
  englishName: string;
  definitionEn: string;
  marketImpactEn: string;
};

type ExplanationRule = { pattern: RegExp; chineseName: string; definition: string; englishName: string; definitionEn: string };

const RULES: ExplanationRule[] = [
  { pattern: /core inflation rate mom|core cpi/i, chineseName: "核心消費者物價指數月率", definition: "剔除食品與能源後的 CPI 月變化，用來觀察較穩定的基礎通膨。", englishName: "Core CPI MoM", definitionEn: "The monthly change in consumer prices excluding food and energy, used to track underlying inflation." },
  { pattern: /inflation rate mom|consumer price index/i, chineseName: "消費者物價指數月率（CPI）", definition: "衡量消費者購買的一籃子商品與服務價格，相較上月的變化。", englishName: "Consumer Price Index MoM", definitionEn: "The monthly change in the prices consumers pay for a representative basket of goods and services." },
  { pattern: /core inflation rate yoy/i, chineseName: "核心消費者物價指數年率", definition: "剔除食品與能源後的 CPI 年變化，用來觀察中期通膨趨勢。", englishName: "Core CPI YoY", definitionEn: "The annual change in consumer prices excluding food and energy." },
  { pattern: /inflation rate yoy/i, chineseName: "消費者物價指數年率（CPI）", definition: "衡量消費者物價相較去年同期的變化，是聯準會觀察通膨的重要指標。", englishName: "Consumer Price Index YoY", definitionEn: "The annual change in consumer prices and a key Federal Reserve inflation indicator." },
  { pattern: /ppi/i, chineseName: "生產者物價指數（PPI）", definition: "衡量生產者出售商品與服務的價格變化，常被視為消費端通膨的先行訊號。", englishName: "Producer Price Index", definitionEn: "Measures changes in prices received by producers and can signal future consumer inflation pressure." },
  { pattern: /non farm payrolls|nonfarm payrolls/i, chineseName: "非農就業人口", definition: "統計美國農業以外的就業增減，用來觀察勞動市場與經濟動能。", englishName: "Nonfarm Payrolls", definitionEn: "Measures the change in U.S. employment outside farming and labor-market momentum." },
  { pattern: /unemployment rate/i, chineseName: "失業率", definition: "失業人口占勞動力的比例，反映勞動市場的鬆緊程度。", englishName: "Unemployment Rate", definitionEn: "The share of the labor force that is unemployed." },
  { pattern: /jolts/i, chineseName: "職位空缺與勞動流動調查（JOLTS）", definition: "統計職位空缺、招聘與離職，觀察勞動需求與就業市場的熱度。", englishName: "JOLTS Job Openings", definitionEn: "Measures job openings and labor flows to track labor demand." },
  { pattern: /ism manufacturing pmi/i, chineseName: "ISM 製造業採購經理人指數（PMI）", definition: "調查製造業企業的訂單、生產、就業與庫存；50 以上通常代表擴張。", englishName: "ISM Manufacturing PMI", definitionEn: "A survey of manufacturing orders, production, employment and inventories; above 50 generally indicates expansion." },
  { pattern: /ism services pmi/i, chineseName: "ISM 服務業採購經理人指數（PMI）", definition: "調查服務業活動、訂單、就業與價格，反映服務業景氣方向。", englishName: "ISM Services PMI", definitionEn: "A survey of services activity, orders, employment and prices." },
  { pattern: /michigan consumer sentiment|consumer sentiment/i, chineseName: "密西根大學消費者信心指數", definition: "調查家庭對目前財務、經濟前景與消費意願的看法，反映消費動能。", englishName: "Michigan Consumer Sentiment", definitionEn: "A household survey of personal finances, the economic outlook and willingness to spend." },
  { pattern: /gdp growth|gross domestic product/i, chineseName: "國內生產毛額（GDP）", definition: "衡量美國經濟活動總量與成長速度，是最重要的景氣總指標之一。", englishName: "Gross Domestic Product", definitionEn: "Measures total U.S. economic output and its growth rate." },
  { pattern: /retail sales/i, chineseName: "零售銷售", definition: "衡量零售商銷售額變化，用來觀察家庭消費與內需強弱。", englishName: "Retail Sales", definitionEn: "Measures changes in retail receipts and household demand." },
  { pattern: /building permits/i, chineseName: "建築許可", definition: "統計新住宅建築許可數量，是住宅建設活動的前瞻指標。", englishName: "Building Permits", definitionEn: "Counts permits issued for new residential construction." },
  { pattern: /housing starts/i, chineseName: "新屋開工", definition: "統計新住宅實際開工數量，反映房市與建築活動。", englishName: "Housing Starts", definitionEn: "Counts residential construction projects that have begun." },
  { pattern: /durable goods/i, chineseName: "耐久財訂單", definition: "衡量耐久財新訂單變化，反映企業投資與製造業需求。", englishName: "Durable Goods Orders", definitionEn: "Measures new orders for durable goods and business demand." },
  { pattern: /crude oil inventories|petroleum status/i, chineseName: "原油庫存", definition: "衡量美國原油庫存變化，反映能源供需平衡。", englishName: "Crude Oil Inventories", definitionEn: "Measures changes in U.S. crude inventories and the energy supply-demand balance." },
  { pattern: /gasoline inventories/i, chineseName: "汽油庫存", definition: "衡量美國汽油庫存變化，常用來觀察燃料需求與供給。", englishName: "Gasoline Inventories", definitionEn: "Measures changes in U.S. gasoline inventories." },
  { pattern: /distillate inventories/i, chineseName: "蒸餾油庫存", definition: "衡量柴油與其他蒸餾油庫存變化，反映工業與運輸燃料需求。", englishName: "Distillate Inventories", definitionEn: "Measures changes in distillate fuel inventories." },
  { pattern: /natural gas storage/i, chineseName: "天然氣庫存", definition: "衡量天然氣庫存變化，反映供需平衡與能源價格壓力。", englishName: "Natural Gas Storage", definitionEn: "Measures changes in natural-gas inventories and energy supply-demand balance." },
  { pattern: /federal funds|interest rate decision/i, chineseName: "聯邦基金利率決策", definition: "聯準會對政策利率目標區間的決定，直接影響美元、利率與風險資產估值。", englishName: "Federal Funds Rate Decision", definitionEn: "The Federal Reserve's decision on its policy-rate target range." },
  { pattern: /fomc minutes/i, chineseName: "聯邦公開市場委員會會議紀要", definition: "公布 FOMC 會議討論內容與委員對經濟及利率路徑的看法。", englishName: "FOMC Minutes", definitionEn: "A detailed record of the FOMC discussion and policymakers' views." },
  { pattern: /press conference/i, chineseName: "聯準會主席記者會", definition: "利率決策後的政策說明與問答，市場會從措辭判斷未來政策方向。", englishName: "Federal Reserve Press Conference", definitionEn: "The Chair's policy explanation and Q&A, watched for future policy guidance." },
  { pattern: /speech|testimony|discussion/i, chineseName: "聯準會官員演說／聽證", definition: "官員對經濟與貨幣政策的公開發言或國會證詞，屬文字與語氣資訊。", englishName: "Federal Reserve Speech or Testimony", definitionEn: "Public policy communication whose wording and tone matter more than a single number." },
];

function isQualitative(event: EconomicEvent): boolean {
  return /\b(speech|testimony|discussion|press conference|minutes|beige book)\b/i.test(event.name);
}

function fallback(event: EconomicEvent): Pick<EventExplanation, "chineseName" | "definition" | "englishName" | "definitionEn"> {
  const names: Record<string, string> = { inflation: "通膨指標", employment: "就業指標", growth: "經濟成長指標", manufacturing: "製造業景氣指標", services: "服務業景氣指標", energy: "能源指標", housing: "房市指標", consumer: "消費指標", monetary_policy: "貨幣政策事件" };
  return { chineseName: names[event.category] ?? "美國經濟事件", definition: "官方排程中的美國經濟或貨幣政策事件，詳細定義依資料來源公告為準。", englishName: event.name, definitionEn: "An official U.S. economic or monetary-policy event. Refer to the source release for its precise definition." };
}

export function explainEvent(event: EconomicEvent): EventExplanation {
  const rule = RULES.find((item) => item.pattern.test(event.name)) ?? fallback(event);
  if (isQualitative(event)) return { ...rule, marketImpact: "此事件沒有可用的 Actual／Forecast 數值；請以官方文字內容、語氣與市場反應判讀。", marketImpactEn: "This is not a quantitative release with comparable Actual and Forecast values. Interpret the official wording and market reaction." };
  const inventory = /crude oil inventories|gasoline inventories|distillate inventories|natural gas storage/i.test(event.name);
  const labor = /unemployment rate/i.test(event.name);
  const policyOrInflation = event.category === "inflation" || /federal funds|interest rate decision/i.test(event.name);
  const higher = labor ? "通常利空股市、原油與美元，利多黃金；失業率上升代表勞動市場轉弱。" : inventory ? "庫存高於預期通常代表供給較充裕或需求較弱，能源價格偏利空。" : policyOrInflation ? "通常利空黃金與股市、利多美元；市場可能提高對高利率的預期。" : "通常利多股市與原油、利空黃金；市場會解讀為經濟動能較強。";
  const lower = labor ? "通常利多股市、原油與美元，利空黃金；失業率下降代表勞動市場轉強。" : inventory ? "庫存低於預期通常代表供給較緊或需求較強，能源價格偏利多。" : policyOrInflation ? "通常利多黃金與股市、利空美元；市場可能降低對高利率的預期。" : "通常利空股市與原油、利多黃金；市場會解讀為經濟動能較弱。";
  const higherEn = labor ? "Typically bearish for equities, oil and USD, and bullish for gold because a higher rate signals a weaker labor market." : inventory ? "A larger inventory build usually signals ample supply or weaker demand and is typically bearish for energy prices." : policyOrInflation ? "Typically bearish for gold and equities and bullish for USD as markets may price a higher rate path." : "Typically bullish for equities and oil and potentially bullish for USD as growth appears stronger.";
  const lowerEn = labor ? "Typically bullish for equities, oil and USD, and bearish for gold because a lower rate signals a stronger labor market." : inventory ? "A smaller inventory build or draw usually signals tighter supply or stronger demand and is typically bullish for energy prices." : policyOrInflation ? "Typically bullish for gold and equities and bearish for USD as markets may price a lower rate path." : "Typically bearish for equities and oil and potentially bearish for USD as growth appears weaker.";
  return { ...rule, marketImpact: `高於預期：${higher}\n低於預期：${lower}`, marketImpactEn: `Above expectations: ${higherEn}\nBelow expectations: ${lowerEn}` };
}
