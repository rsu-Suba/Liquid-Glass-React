import "./App.css";
import Glass from "./Glass.tsx";

export default function App() {
    return (
        <div className="mainCanvas">
            <Glass
                imageUrl="./26-Tahoe-Beach-Day-thumb.jpeg"
                width={250}
                height={250}
                bgScale={1.0}
                bgOffsetX={0}
                bgOffsetY={0}
            />
        </div>
    );
}
