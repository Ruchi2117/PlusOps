import type {
  MetricAggregation as MetricAggregationContract,
  MetricType
} from "@plusops/contracts";

import { MetricDomainError } from "./metric-domain.error";

const validAggregationsByType: Record<MetricType, readonly MetricAggregationContract[]> = {
  counter: ["sum", "count", "rate"],
  gauge: ["average", "minimum", "maximum", "count", "moving_average"],
  histogram: ["average", "minimum", "maximum", "count", "percentile"],
  summary: ["average", "minimum", "maximum", "count", "percentile"],
  state: ["count"]
} satisfies Record<MetricType, readonly MetricAggregationContract[]>;

export class MetricAggregation {
  static assertSupported(type: MetricType, aggregation: MetricAggregationContract): void {
    if (!validAggregationsByType[type].includes(aggregation)) {
      throw new MetricDomainError(
        `Aggregation '${aggregation}' is not supported for metric type '${type}'.`
      );
    }
  }

  static defaultsFor(type: MetricType): MetricAggregationContract {
    if (type === "counter") {
      return "rate";
    }

    if (type === "histogram" || type === "summary") {
      return "percentile";
    }

    if (type === "state") {
      return "count";
    }

    return "average";
  }
}
