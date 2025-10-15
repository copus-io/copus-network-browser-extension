import React, { useState } from "react";
import { Avatar, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

const topicOptions = [
  {
    id: "life",
    label: "Life",
    color: "text-pink",
    borderColor: "border-[#ea7db7]",
    bgColor:
      "bg-[linear-gradient(0deg,rgba(234,125,183,0.2)_0%,rgba(234,125,183,0.2)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]",
    selected: true,
  },
  {
    id: "art",
    label: "Art",
    color: "text-green",
    borderColor: "border-[#2b8649]",
    bgColor: "",
    selected: false,
  },
  {
    id: "design",
    label: "Design",
    color: "text-blue",
    borderColor: "border-[#2191fb]",
    bgColor: "",
    selected: false,
  },
  {
    id: "technology",
    label: "Technology",
    color: "text-[#c9b71f]",
    borderColor: "border-[#c9b71f]",
    bgColor: "",
    selected: false,
  },
];

export const Create = (): JSX.Element => {
  const [selectedTopic, setSelectedTopic] = useState("life");
  const [recommendationText, setRecommendationText] = useState("");

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
  };

  const handleRecommendationChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (e.target.value.length <= 1000) {
      setRecommendationText(e.target.value);
    }
  };

  return (
    <div
      className="w-[400px] flex rounded-[0px_0px_15px_15px] overflow-hidden bg-[linear-gradient(0deg,rgba(224,224,224,0.18)_0%,rgba(224,224,224,0.18)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)] translate-y-[-1rem] animate-fade-in opacity-0"
      data-model-id="9043:1904"
    >
      <Card className="w-[400px] h-[989px] rounded-[0px_0px_15px_15px] border-0 shadow-none bg-transparent">
        <CardContent className="items-end gap-10 pt-5 pb-[30px] px-5 flex flex-col h-full">
          <header className="flex items-start justify-between relative self-stretch w-full flex-[0_0_auto] bg-transparent translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
            <div className="inline-flex items-center gap-2.5 relative flex-[0_0_auto]">
              <div className="flex w-[45px] h-[45px] items-center justify-center gap-2.5 p-2.5 relative bg-red rounded-[100px]">
                <img
                  className="relative w-7 h-7 mt-[-1.50px] mb-[-1.50px] ml-[-1.50px] mr-[-1.50px]"
                  alt="Ic fractopus open"
                  src="https://c.animaapp.com/mg0kz9olCQ44yb/img/ic-fractopus-open-1.svg"
                />
              </div>

              <div className="relative w-fit [font-family:'Lato',Helvetica] font-bold text-dark-grey text-lg tracking-[0.90px] leading-[27px] whitespace-nowrap">
                Copus
              </div>
            </div>

            <Avatar className="w-[45px] h-[45px]">
              <AvatarImage
                src="https://c.animaapp.com/mg0kz9olCQ44yb/img/avatar.png"
                alt="Avatar"
                className="object-cover"
              />
            </Avatar>
          </header>

          <div className="items-start gap-[30px] self-stretch w-full flex-[0_0_auto] flex flex-col translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
            <div className="flex flex-col items-start gap-[5px] relative self-stretch w-full flex-[0_0_auto]">
              <Label className="inline-flex flex-col h-[23px] items-start justify-center gap-2.5 relative font-p-l font-[number:var(--p-l-font-weight)] text-medium-dark-grey text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] [font-style:var(--p-l-font-style)]">
                Link
              </Label>

              <div className="flex items-center relative self-stretch w-full flex-[0_0_auto] rounded-[15px]">
                <div className="inline-flex items-center justify-center gap-2.5 px-0 py-[5px] relative flex-[0_0_auto] rounded-[15px]">
                  <div className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-medium-dark-grey text-lg tracking-[0] leading-5 whitespace-nowrap">
                    http://xxxxx.com
                  </div>
                </div>
              </div>
            </div>

            <div className="items-start gap-2.5 self-stretch w-full flex-[0_0_auto] flex flex-col">
              <Label className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-off-black text-base tracking-[0] leading-4">
                <span className="text-[#f23a00] leading-[0.1px]">*</span>
                <span className="text-[length:var(--p-l-font-size)] text-[#686868] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)]">
                  Title
                </span>
              </Label>

              <Input
                defaultValue="AI Agents Problems No One Talks About"
                className="flex items-start gap-[5px] px-[15px] py-2.5 self-stretch w-full bg-white h-auto border-0 rounded-[15px] [font-family:'Lato',Helvetica] font-normal text-dark-grey text-lg tracking-[0] leading-[23.4px]"
              />
            </div>

            <div className="items-start gap-2.5 self-stretch w-full flex-[0_0_auto] flex flex-col">
              <Label className="flex w-[60px] items-center relative flex-[0_0_auto] [font-family:'Lato',Helvetica] font-normal text-off-black text-lg tracking-[0] leading-[18px]">
                <span className="text-[#f23a00] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)] text-[length:var(--p-l-font-size)]">
                  *
                </span>
                <span className="text-[#686868] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)] text-[length:var(--p-l-font-size)]">
                  Cover
                </span>
              </Label>

              <img
                className="relative self-stretch w-full h-[202px] border border-dashed border-[#a8a8a8] object-cover"
                alt="Preview image"
                src="https://c.animaapp.com/mg0kz9olCQ44yb/img/preview-image.png"
              />
            </div>

            <div className="items-start gap-2.5 self-stretch w-full flex-[0_0_auto] flex flex-col">
              <Label className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-off-black text-base tracking-[0] leading-4">
                <span className="text-[#f23a00] leading-[0.1px]">*</span>
                <span className="text-[length:var(--p-l-font-size)] text-[#686868] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)]">
                  Recommendation
                </span>
              </Label>

              <div className="flex flex-col h-44 items-start justify-between px-[15px] py-2.5 relative self-stretch w-full bg-white rounded-[15px]">
                <Textarea
                  placeholder="Please describe why you recommend this link..."
                  value={recommendationText}
                  onChange={handleRecommendationChange}
                  className="relative self-stretch mt-[-1.00px] font-p-l font-[number:var(--p-l-font-weight)] text-medium-grey text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] [font-style:var(--p-l-font-style)] border-0 resize-none bg-transparent p-0 focus-visible:ring-0 h-auto flex-1"
                  maxLength={1000}
                />

                <div className="relative self-stretch [font-family:'Maven_Pro',Helvetica] font-normal text-medium-grey text-base text-right tracking-[0] leading-[25px]">
                  {recommendationText.length}/1000
                </div>
              </div>
            </div>

            <div className="items-start gap-2.5 self-stretch w-full flex-[0_0_auto] flex flex-col">
              <Label className="relative w-fit mt-[-1.00px] font-p font-[number:var(--p-font-weight)] text-off-black text-[length:var(--p-font-size)] tracking-[var(--p-letter-spacing)] leading-[var(--p-line-height)] whitespace-nowrap [font-style:var(--p-font-style)]">
                Choose a topic
              </Label>

              <div className="inline-flex items-start gap-2.5 relative flex-[0_0_auto]">
                {topicOptions.map((topic) => (
                  <Button
                    key={topic.id}
                    variant="outline"
                    onClick={() => handleTopicSelect(topic.id)}
                    className={`${topic.borderColor} ${selectedTopic === topic.id ? topic.bgColor : ""} inline-flex items-center gap-[5px] px-2.5 py-2 h-auto flex-[0_0_auto] rounded-[50px] border border-solid hover:bg-opacity-20 transition-colors`}
                  >
                    <span
                      className={`relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-semibold ${topic.color} text-sm tracking-[0] leading-[14px] whitespace-nowrap`}
                    >
                      {topic.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="inline-flex items-start gap-10 relative flex-[0_0_auto] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms]">
            <Button
              variant="ghost"
              className="inline-flex h-[45px] items-center justify-center gap-[30px] px-5 py-[15px] relative flex-[0_0_auto] rounded-[15px] hover:bg-transparent"
            >
              <span className="relative w-fit mt-[-7.00px] mb-[-3.00px] [font-family:'Lato',Helvetica] font-normal text-dark-grey text-lg tracking-[0] leading-[25.2px] whitespace-nowrap">
                Cancel
              </span>
            </Button>

            <Button className="inline-flex items-center justify-center gap-[15px] px-5 py-2.5 h-auto relative flex-[0_0_auto] bg-red rounded-[50px] hover:bg-red/90 transition-colors">
              <span className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-bold text-white text-lg tracking-[0] leading-[27px] whitespace-nowrap">
                Publish
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
