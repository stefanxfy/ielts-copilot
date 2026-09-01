/**
 * /plan 备考计划(P7 落地,P6 先占位)
 *
 * P7 将提供:三步向导(考试日期/目标分/每日量)→ 作战主页
 * (倒计时+考前须知 / 今日任务 / 打卡日历 / 心得 / AI 昨日总结)。
 * 数据表 study_plans / study_activities / study_journals 到时一并迁移。
 */

export const runtime = "nodejs";

export default function PlanPage() {
  return (
    <>
      <h2 className="text-xl">备考计划</h2>
      <p className="mb-5 text-[13px] text-[#5b6574]">
        开启雅思备考作战计划 · P7 版本开放
      </p>

      <div className="rounded-xl border border-[#dfe4ec] bg-white px-6 py-12 text-center">
        <div className="text-[40px]">🗓️</div>
        <div className="mt-3 text-[15px] font-medium">作战计划即将上线</div>
        <p className="mx-auto mt-2 max-w-[460px] text-[13px] leading-relaxed text-[#5b6574]">
          选择考试日期与目标分数，自动生成分阶段备考计划；
          自动打卡、备考心得与 AI 昨日总结将在后续版本一并提供。
        </p>
        <div className="mx-auto mt-5 grid max-w-[560px] gap-2 text-left text-[12px] text-[#5b6574]">
          <div className="rounded-lg bg-[#f7f9fc] px-3 py-2">
            ① 定目标 —— 考试日期(机考每日可考) · 总分与四科目标
          </div>
          <div className="rounded-lg bg-[#f7f9fc] px-3 py-2">
            ② 看进度 —— 考试倒计时 · 目标达成 · 打卡日历
          </div>
          <div className="rounded-lg bg-[#f7f9fc] px-3 py-2">
            ③ 留痕迹 —— 每日/周/月备考心得 · AI 自动总结昨日学习
          </div>
        </div>
      </div>
    </>
  );
}
