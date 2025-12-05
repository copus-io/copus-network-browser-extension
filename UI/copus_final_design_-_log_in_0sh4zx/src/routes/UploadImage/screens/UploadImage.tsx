import { Camera, Search, Upload, X } from "lucide-react";
import React, { useState, useRef } from "react";
import { Avatar, AvatarImage } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";

const topicData = [
  {
    name: "Life",
    color: "text-pink",
    borderColor: "border-[#ea7db7]",
    bgColor:
      "bg-[linear-gradient(0deg,rgba(234,125,183,0.2)_0%,rgba(234,125,183,0.2)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]",
    selected: true,
  },
  {
    name: "Art",
    color: "text-green",
    borderColor: "border-[#2b8649]",
    bgColor: "",
    selected: false,
  },
  {
    name: "Design",
    color: "text-blue",
    borderColor: "border-[#2191fb]",
    bgColor: "",
    selected: false,
  },
  {
    name: "Technology",
    color: "text-[#c9b71f]",
    borderColor: "border-[#c9b71f]",
    bgColor: "",
    selected: false,
  },
];

export const UploadImage = (): JSX.Element => {
  const [showUploadInterface, setShowUploadInterface] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCloseImage = () => {
    if (selectedImage) {
      setSelectedImage(null);
      setShowUploadInterface(true);
    } else {
      setShowUploadInterface(true);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setShowUploadInterface(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-[400px] flex rounded-[0px_0px_15px_15px] overflow-hidden bg-[linear-gradient(0deg,rgba(224,224,224,0.18)_0%,rgba(224,224,224,0.18)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
      <div className="w-[400px] h-[989px] items-end gap-10 pt-5 pb-[30px] px-5 rounded-[0px_0px_15px_15px] flex relative flex-col">
        <header className="flex items-start justify-between relative self-stretch w-full flex-[0_0_auto] bg-transparent">
          <div className="inline-flex items-center gap-2.5 relative flex-[0_0_auto]">
            <div className="flex w-[45px] h-[45px] items-center justify-center gap-2.5 p-2.5 relative bg-red rounded-[100px]">
              <img
                className="relative w-7 h-7 mt-[-1.50px] mb-[-1.50px] ml-[-1.50px] mr-[-1.50px]"
                alt="Ic fractopus open"
                src="https://c.animaapp.com/mg0oeg48MCyWLK/img/ic-fractopus-open.svg"
              />
            </div>

            <div className="relative w-fit [font-family:'Lato',Helvetica] font-bold text-dark-grey text-lg tracking-[0.90px] leading-[27px] whitespace-nowrap">
              Copus
            </div>
          </div>

          <Avatar className="w-[45px] h-[45px]">
            <AvatarImage
              src="https://c.animaapp.com/mg0oeg48MCyWLK/img/avatar.png"
              alt="Avatar"
            />
          </Avatar>
        </header>

        <div className="flex flex-col items-start gap-[30px] relative self-stretch w-full flex-[0_0_auto]">
          <div className="flex flex-col items-start gap-[5px] relative self-stretch w-full flex-[0_0_auto]">
            <Label className="inline-flex flex-col h-[23px] items-start justify-center gap-2.5 relative">
              <div className="relative flex items-center justify-center w-fit mt-[-2.00px] font-p-l font-[number:var(--p-l-font-weight)] text-medium-dark-grey text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] whitespace-nowrap [font-style:var(--p-l-font-style)]">
                Link
              </div>
            </Label>

            <div className="flex items-center relative self-stretch w-full flex-[0_0_auto] rounded-[15px]">
              <div className="inline-flex items-center justify-center gap-2.5 px-0 py-[5px] relative flex-[0_0_auto] rounded-[15px]">
                <div className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-medium-dark-grey text-lg tracking-[0] leading-5 whitespace-nowrap">
                  http://xxxxx.com
                </div>
              </div>
            </div>
          </div>

          <div className="items-start gap-2.5 self-stretch w-full flex-[0_0_auto] flex relative flex-col">
            <Label className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-off-black text-base tracking-[0] leading-4">
              <span className="text-[#f23a00] leading-[0.1px]">*</span>
              <span className="text-[#686868] text-[length:var(--p-l-font-size)] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)]">
                Title
              </span>
            </Label>

            <Input
              defaultValue="AI Agents Problems No One Talks About"
              className="flex items-start gap-[5px] px-[15px] py-2.5 relative self-stretch w-full flex-[0_0_auto] bg-white rounded-[15px] border-0 [font-family:'Lato',Helvetica] font-normal text-dark-grey text-lg tracking-[0] leading-[23.4px] h-auto"
            />
          </div>

          <div className="items-start gap-2.5 self-stretch w-full flex-[0_0_auto] flex relative flex-col">
            <div className="flex w-[60px] items-center relative flex-[0_0_auto]">
              <Label className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-off-black text-lg tracking-[0] leading-[18px]">
                <span className="text-[#f23a00] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)] text-[length:var(--p-l-font-size)]">
                  *
                </span>
                <span className="text-[#686868] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)] text-[length:var(--p-l-font-size)]">
                  Cover
                </span>
              </Label>
            </div>

            {!showUploadInterface ? (
              <div className="relative self-stretch w-full h-[202px] border border-dashed border-[#a8a8a8] overflow-hidden">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Uploaded cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full [background:url(https://c.animaapp.com/mg0oeg48MCyWLK/img/preview-image.png)_50%_50%_/_cover,linear-gradient(0deg,rgba(224,224,224,0.4)_0%,rgba(224,224,224,0.4)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseImage}
                  className="absolute top-2 right-2 w-6 h-6 p-0 hover:bg-white/20 rounded-full z-10"
                >
                  <X className="w-4 h-4 text-dark-grey" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col h-[202px] items-center justify-center gap-[25px] p-2.5 relative self-stretch w-full border border-dashed border-[#a8a8a8] bg-white">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={handleFileUpload}
                  className="inline-flex items-center justify-center gap-2.5 px-[15px] py-2.5 relative flex-[0_0_auto] bg-white rounded-lg overflow-hidden border border-solid border-[#a8a8a8] h-auto"
                >
                  <div className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-semibold text-dark-grey text-base text-center tracking-[0] leading-[22.4px] whitespace-nowrap">
                    Upload from device
                  </div>
                  <Upload className="w-5 h-4" />
                </Button>

                <div className="inline-flex items-start gap-5 relative flex-[0_0_auto]">
                  <Button
                    variant="ghost"
                    className="inline-flex flex-col items-center justify-center gap-[5px] px-2.5 py-0 relative flex-[0_0_auto] rounded-lg overflow-hidden h-auto"
                  >
                    <Camera className="w-[23px] h-[25px] text-medium-dark-grey" />
                    <div className="relative flex items-center justify-center w-fit [font-family:'Lato',Helvetica] font-normal text-medium-dark-grey text-sm text-center tracking-[0] leading-4 whitespace-nowrap">
                      Capture
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    className="inline-flex flex-col items-center justify-center gap-[5px] px-2.5 py-0 relative flex-[0_0_auto] rounded-lg overflow-hidden h-auto"
                  >
                    <Search className="w-[25px] h-[25px] text-medium-dark-grey" />
                    <div className="relative flex items-center justify-center w-fit [font-family:'Lato',Helvetica] font-normal text-medium-dark-grey text-sm text-center tracking-[0] leading-4 whitespace-nowrap">
                      Detect
                    </div>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="items-start gap-2.5 self-stretch w-full flex-[0_0_auto] flex relative flex-col">
            <Label className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-off-black text-base tracking-[0] leading-4">
              <span className="text-[#f23a00] leading-[0.1px]">*</span>
              <span className="text-[#686868] text-[length:var(--p-l-font-size)] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)]">
                Recommendation
              </span>
            </Label>

            <div className="flex flex-col h-44 items-start justify-between px-[15px] py-2.5 relative self-stretch w-full bg-white rounded-[15px]">
              <Textarea
                placeholder="Please describe why you recommend this link..."
                className="relative self-stretch mt-[-1.00px] font-p-l font-[number:var(--p-l-font-weight)] text-medium-grey text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] [font-style:var(--p-l-font-style)] border-0 bg-transparent resize-none p-0 focus-visible:ring-0 flex-1"
              />
              <div className="relative self-stretch [font-family:'Maven_Pro',Helvetica] font-normal text-medium-grey text-base text-right tracking-[0] leading-[25px]">
                0/1000
              </div>
            </div>
          </div>

          <div className="items-start gap-2.5 self-stretch w-full flex-[0_0_auto] flex relative flex-col">
            <Label className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-off-black text-base tracking-[0] leading-[23px] whitespace-nowrap">
              Choose a topic
            </Label>

            <div className="inline-flex items-start gap-2.5 relative flex-[0_0_auto]">
              {topicData.map((topic, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`inline-flex items-center gap-[5px] px-2.5 py-2 relative flex-[0_0_auto] rounded-[50px] border border-solid ${topic.borderColor} ${topic.bgColor} ${topic.selected ? topic.bgColor : ""} h-auto cursor-pointer hover:opacity-80`}
                >
                  <div
                    className={`relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-semibold ${topic.color} text-sm tracking-[0] leading-[14px] whitespace-nowrap`}
                  >
                    {topic.name}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="inline-flex items-start gap-10 relative flex-[0_0_auto]">
          <Button
            variant="ghost"
            className="inline-flex h-[45px] items-center justify-center gap-[30px] px-5 py-[15px] relative flex-[0_0_auto] rounded-[15px] h-auto"
          >
            <div className="relative w-fit mt-[-7.00px] mb-[-3.00px] [font-family:'Lato',Helvetica] font-normal text-dark-grey text-lg tracking-[0] leading-[25.2px] whitespace-nowrap">
              Cancel
            </div>
          </Button>

          <Button className="inline-flex items-center justify-center gap-[15px] px-5 py-2.5 relative flex-[0_0_auto] bg-red rounded-[50px] h-auto hover:bg-red/90">
            <div className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-bold text-white text-lg tracking-[0] leading-[27px] whitespace-nowrap">
              Publish
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};
