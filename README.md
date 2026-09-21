# UniBE CVG Computer Vision Interactive Labs

[English](#english) · [Deutsch](#deutsch) · [中文](#中文)

Local, self-contained copies of the interactive websites used in the University of Bern Computer Vision tutorials.

## English

### Included labs

| Lab | Folder | Topics |
| --- | --- | --- |
| Tutorial 01 | `tutorial-01-pinhole-camera-lab` | Pinhole camera, projection, field of view, interactive questions |
| Tutorial 02 | `tutorial-02-optics-filters-edges-lab` | Thin lenses, ray transfer, filtering, gradients and events |

### Course PDFs

| Tutorial | Exercise sheet | Solution |
| --- | --- | --- |
| Tutorial 01 | [Tutorial PDF](tutorial-01-pinhole-camera-lab/materials/tutorial_01.pdf) | [Solution PDF](tutorial-01-pinhole-camera-lab/materials/tutorial_01_solution.pdf) |
| Tutorial 02 | [Tutorial PDF](tutorial-02-optics-filters-edges-lab/materials/tutorial_02.pdf) | [Solution PDF](tutorial-02-optics-filters-edges-lab/materials/tutorial_02_solution.pdf) |

The solution PDFs are intended for use after the tutorial discussion.

### Requirements

- [Node.js](https://nodejs.org/) 22.13 or newer
- A current web browser
- Internet access only for the first dependency installation

### Run locally

```bash
git clone https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs.git
cd Unibe-CVG-CV-Interactive-Labs
npm run setup
npm run dev:01
```

Open the local address printed in the terminal, normally `http://localhost:3000`. Stop the server with `Ctrl+C`, then start Tutorial 02 with:

```bash
npm run dev:02
```

No ChatGPT account is required. The visualizations, questions and released answers work locally. Votes are stored only in the local development database and are not synchronized with the classroom website. The development server is intentionally available only on your own computer.

## Deutsch

### Enthaltene Labs

| Lab | Ordner | Themen |
| --- | --- | --- |
| Tutorial 01 | `tutorial-01-pinhole-camera-lab` | Lochkamera, Projektion, Sichtfeld, interaktive Fragen |
| Tutorial 02 | `tutorial-02-optics-filters-edges-lab` | Dünne Linsen, Strahltransfer, Filterung, Gradienten und Events |

### Kursunterlagen als PDF

| Tutorial | Aufgabenblatt | Lösung |
| --- | --- | --- |
| Tutorial 01 | [Tutorial-PDF](tutorial-01-pinhole-camera-lab/materials/tutorial_01.pdf) | [Lösungs-PDF](tutorial-01-pinhole-camera-lab/materials/tutorial_01_solution.pdf) |
| Tutorial 02 | [Tutorial-PDF](tutorial-02-optics-filters-edges-lab/materials/tutorial_02.pdf) | [Lösungs-PDF](tutorial-02-optics-filters-edges-lab/materials/tutorial_02_solution.pdf) |

Die Lösungs-PDFs sind für die Verwendung nach der Besprechung im Tutorial vorgesehen.

### Voraussetzungen

- [Node.js](https://nodejs.org/) ab Version 22.13
- Ein aktueller Webbrowser
- Internetzugang nur für die erste Installation

### Lokal starten

```bash
git clone https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs.git
cd Unibe-CVG-CV-Interactive-Labs
npm run setup
npm run dev:01
```

Die im Terminal angezeigte lokale Adresse öffnen, normalerweise `http://localhost:3000`. Den Server mit `Ctrl+C` beenden und Tutorial 02 starten mit:

```bash
npm run dev:02
```

Ein ChatGPT-Konto ist nicht erforderlich. Visualisierungen, Fragen und veröffentlichte Antworten funktionieren lokal. Abstimmungen werden nur in der lokalen Entwicklungsdatenbank gespeichert und nicht mit der Kurswebseite synchronisiert. Der Entwicklungsserver ist absichtlich nur auf dem eigenen Computer erreichbar.

## 中文

### 包含的网站

| 网站 | 文件夹 | 内容 |
| --- | --- | --- |
| Tutorial 01 | `tutorial-01-pinhole-camera-lab` | 针孔相机、投影、视场角和互动题目 |
| Tutorial 02 | `tutorial-02-optics-filters-edges-lab` | 薄透镜、光线传递、滤波、梯度和事件相机 |

### 课程 PDF

| Tutorial | 题目 | 解答 |
| --- | --- | --- |
| Tutorial 01 | [Tutorial PDF](tutorial-01-pinhole-camera-lab/materials/tutorial_01.pdf) | [Solution PDF](tutorial-01-pinhole-camera-lab/materials/tutorial_01_solution.pdf) |
| Tutorial 02 | [Tutorial PDF](tutorial-02-optics-filters-edges-lab/materials/tutorial_02.pdf) | [Solution PDF](tutorial-02-optics-filters-edges-lab/materials/tutorial_02_solution.pdf) |

解答 PDF 建议在课堂讨论结束后查看。

### 环境要求

- [Node.js](https://nodejs.org/) 22.13 或更高版本
- 现代浏览器
- 仅首次安装依赖时需要联网

### 本地运行

```bash
git clone https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs.git
cd Unibe-CVG-CV-Interactive-Labs
npm run setup
npm run dev:01
```

打开终端中显示的本地地址，通常是 `http://localhost:3000`。按 `Ctrl+C` 停止网站，然后运行 Tutorial 02：

```bash
npm run dev:02
```

本地使用不需要 ChatGPT 账号。可视化、题目和已公布答案均可使用；投票只保存在本机开发数据库中，不会与课堂网站同步。开发服务器仅允许本机访问。
