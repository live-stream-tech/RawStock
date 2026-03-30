import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import CommunityTop from "./pages/CommunityTop";
import CommunityDetail from "./pages/CommunityDetail";
import CommunityList from "./pages/CommunityList";
import MyPage from "./pages/MyPage";
import Revenue from "./pages/Revenue";
import LiveViewer from "./pages/LiveViewer";
import EditorRanking from "./pages/EditorRanking";
import DMList from "./pages/DMList";
import DMDetail from "./pages/DMDetail";
import LiveList from "./pages/LiveList";
import Auth from "./pages/Auth";
import LandingPage from "./rawstock-lp/LandingPage";
import JukeboxPage from "./pages/Jukebox";
import CoinSuccess from "./pages/CoinSuccess";
import AdReservation from "./pages/AdReservation";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        Component: LandingPage,
      },
      {
        path: "lp",
        Component: LandingPage,
      },
      {
        path: "home",
        Component: CommunityTop,
      },
      {
        path: "communities",
        Component: CommunityList,
      },
      {
        path: "community/:id",
        Component: CommunityDetail,
      },
      {
        path: "mypage",
        Component: MyPage,
      },
      {
        path: "revenue",
        Component: Revenue,
      },
      {
        path: "live/:id",
        Component: LiveViewer,
      },
      {
        path: "editors",
        Component: EditorRanking,
      },
      {
        path: "dm",
        Component: DMList,
      },
      {
        path: "dm/:id",
        Component: DMDetail,
      },
      {
        path: "live-list",
        Component: LiveList,
      },
      {
        path: "auth",
        Component: Auth,
      },
      {
        path: "jukebox/:id",
        Component: JukeboxPage,
      },
      {
        path: "coins/success",
        Component: CoinSuccess,
      },
      {
        path: "community/:id/ad",
        Component: AdReservation,
      },
    ],
  },
]);
