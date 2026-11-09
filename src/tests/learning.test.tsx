import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Learning } from "../pages/Learning";

async function openSimulation() {
  const user = userEvent.setup();
  render(<Learning />);
  await user.click(screen.getByRole("tab", { name: "Simular impacto" }));
  return user;
}

describe("Learning", () => {
  it("navigates tabs with the keyboard and moves focus to the active tab", async () => {
    const user = userEvent.setup();
    render(<Learning />);
    const structure = screen.getByRole("tab", { name: "Explorar a estrutura" });
    const simulation = screen.getByRole("tab", { name: "Simular impacto" });
    structure.focus();
    for (const key of ["{ArrowRight}", "{Home}", "{End}", "{ArrowLeft}"]) {
      await user.keyboard(key);
      const active =
        key === "{ArrowRight}" || key === "{End}" ? simulation : structure;
      const inactive = active === simulation ? structure : simulation;
      expect(active).toHaveFocus();
      expect(active).toHaveAttribute("aria-selected", "true");
      expect(active).toHaveAttribute("tabindex", "0");
      expect(inactive).toHaveAttribute("aria-selected", "false");
      expect(inactive).toHaveAttribute("tabindex", "-1");
      expect(screen.getByRole("tabpanel")).toHaveAttribute(
        "aria-labelledby",
        active.id,
      );
    }
  });

  it.each(["Servidores", "Refrigeração", "Energia", "Redes", "Segurança"])(
    "selects %s through the illustration and synchronizes the system navigation",
    async (name) => {
      const user = userEvent.setup();
      render(<Learning />);
      await user.click(
        screen.getByRole("button", { name: `Explorar ${name}` }),
      );
      expect(
        screen.getByRole("heading", { name }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: new RegExp(`^0\\d ${name}$`) }),
      ).toHaveAttribute("aria-pressed", "true");
      await user.click(screen.getByRole("button", { name: "03 Energia" }));
      expect(
        screen.getByRole("button", { name: "Explorar Energia" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("heading", { name: "Energia" }),
      ).toBeInTheDocument();
    },
  );

  it("limits illustration zoom and allows returning to the original size", async () => {
    const user = userEvent.setup();
    render(<Learning />);
    const decrease = screen.getByRole("button", { name: "Reduzir ilustração" });
    const increase = screen.getByRole("button", { name: "Ampliar ilustração" });
    expect(decrease).toBeDisabled();
    for (let i = 0; i < 4; i++) await user.click(increase);
    expect(screen.getByText("160%")).toBeInTheDocument();
    expect(increase).toBeDisabled();
    for (let i = 0; i < 4; i++) await user.click(decrease);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(decrease).toBeDisabled();
  });

  it("recalculates energy and water when a period shortcut is selected", async () => {
    const user = await openSimulation();
    expect(screen.getByText("540.000 kWh em 720 horas")).toBeInTheDocument();
    for (const [period, hours, total, water] of [
      ["24 horas", 24, "18.000", "12.000"],
      ["365 dias", 8760, "6.570.000", "4.380.000"],
      ["30 dias", 720, "540.000", "360.000"],
    ] as const) {
      await user.click(screen.getByRole("button", { name: period }));
      expect(
        screen.getByRole("spinbutton", { name: /Horas de funcionamento/ }),
      ).toHaveValue(hours);
      expect(
        screen.getByText(
          `${total} kWh em ${hours.toLocaleString("pt-BR")} horas`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(`${water} litros · WUE aplicado à energia da TI`),
      ).toBeInTheDocument();
    }
  });

  it.each([
    [/Potência média da TI/, ""],
    [/Potência média da TI/, "-1"],
    [/PUE hipotético/, "0.9"],
    [/Horas de funcionamento/, "-1"],
    [/WUE hipotético/, "-1"],
  ])(
    "rejects an invalid input (%s, %s) and recovers after reset",
    async (name, value) => {
      const user = await openSimulation();
      fireEvent.change(screen.getByRole("spinbutton", { name }), {
        target: { value },
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Preencha os campos");
      expect(
        screen.queryByText("Energia total estimada"),
      ).not.toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Restaurar exemplo" }),
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("540.000 kWh em 720 horas")).toBeInTheDocument();
    },
  );

  it("ignores an invalid WUE when water is disabled and restores all defaults", async () => {
    const user = await openSimulation();
    fireEvent.change(
      screen.getByRole("spinbutton", { name: /WUE hipotético/ }),
      { target: { value: "-1" } },
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Incluir cenário de água" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Água estimada no local"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: /WUE hipotético/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("spinbutton", { name: /Potência média da TI/ }),
      { target: { value: "100" } },
    );
    await user.click(screen.getByRole("button", { name: "24 horas" }));
    await user.click(screen.getByRole("button", { name: "Restaurar exemplo" }));
    expect(screen.getByRole("checkbox")).toBeChecked();
    for (const [name, value] of [
      [/Potência média da TI/, 500],
      [/PUE hipotético/, 1.5],
      [/Horas de funcionamento/, 720],
      [/WUE hipotético/, 1],
    ] as const) {
      expect(screen.getByRole("spinbutton", { name })).toHaveValue(value);
    }
    expect(
      screen.getByText("360.000 litros · WUE aplicado à energia da TI"),
    ).toBeInTheDocument();
  });

  it("synchronizes sliders with numeric fields and expands their range for larger scenarios", async () => {
    const user = await openSimulation();
    const power = screen.getByRole("spinbutton", {
      name: /Potência média da TI/,
    });
    const slider = screen.getByRole("slider", {
      name: "Ajustar potência média da ti",
    });
    fireEvent.change(power, { target: { value: "12000" } });
    expect(slider).toHaveValue("12000");
    expect(slider).toHaveAttribute("max", "12000");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.change(slider, { target: { value: "100" } });
    expect(power).toHaveValue(100);
    slider.focus();
    await user.keyboard("{ArrowRight}{ArrowUp}{ArrowLeft}");
    expect(power).toHaveValue(110);
    fireEvent.change(power, { target: { value: "0" } });
    await user.keyboard("{ArrowDown}");
    expect(power).toHaveValue(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
